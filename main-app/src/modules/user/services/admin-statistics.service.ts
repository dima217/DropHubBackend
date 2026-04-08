import { Injectable } from '@nestjs/common';
import { UsersService } from './user.service';
import { StorageClientService } from 'src/modules/file-client/services/storage-client.service';
import { UniversalPermissionService } from 'src/modules/permission/services/permission.service';
import { ResourceType, AccessRole } from 'src/modules/permission/entities/permission.entity';
import { ActionLogService } from './action-log.service';

@Injectable()
export class AdminStatisticsService {
  constructor(
    private readonly usersService: UsersService,
    private readonly storageClient: StorageClientService,
    private readonly permissionService: UniversalPermissionService,
    private readonly actionLogService: ActionLogService,
  ) {}

  async getDashboardStats(days: number, top: number) {
    const [users] = await this.usersService.findAllAdminList({ page: 1, limit: 10000 });
    const logsSince = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const logs = await this.actionLogService.getLogsSince(logsSince);

    const uploadsByUser = new Map<number, number>();
    const requestsByUser = new Map<number, number>();
    const errorsByUser = new Map<number, number>();
    const ipsByUser = new Map<number, Set<string>>();
    const lastActivityByUser = new Map<number, Date>();

    for (const log of logs) {
      if (!log.userId) continue;
      requestsByUser.set(log.userId, (requestsByUser.get(log.userId) ?? 0) + 1);
      if (log.statusCode >= 400) {
        errorsByUser.set(log.userId, (errorsByUser.get(log.userId) ?? 0) + 1);
      }
      if (log.ip) {
        if (!ipsByUser.has(log.userId)) ipsByUser.set(log.userId, new Set());
        ipsByUser.get(log.userId)!.add(log.ip);
      }
      const prev = lastActivityByUser.get(log.userId);
      if (!prev || log.createdAt > prev) {
        lastActivityByUser.set(log.userId, log.createdAt);
      }

      if (
        log.path.includes('/upload/') &&
        (log.path.includes('/confirm') || log.path.includes('/multipart/complete')) &&
        log.statusCode < 400
      ) {
        uploadsByUser.set(log.userId, (uploadsByUser.get(log.userId) ?? 0) + 1);
      }
    }

    const storageUsageByUser: Array<{ userId: number; email: string; usedBytes: number }> = [];
    const foldersLoad: Array<{
      storageId: string;
      folderId: string;
      folderName: string;
      childrenCount: number;
      filesCount: number;
      foldersCount: number;
    }> = [];

    for (const user of users) {
      const permissions = await this.permissionService.getPermissionsByUserIdAndType(
        user.id,
        ResourceType.STORAGE,
      );
      const storageIds = permissions
        .filter((permission) => permission.role === AccessRole.ADMIN)
        .map((permission) => permission.resourceId);
      const uniqueStorageIds = Array.from(new Set(storageIds));

      let totalBytes = 0;
      for (const storageId of uniqueStorageIds) {
        const items = await this.storageClient.getFullStorageStructureAdmin(storageId);
        totalBytes += items.reduce(
          (acc, item) => acc + (item.isDirectory ? 0 : (item.fileMeta?.size ?? 0)),
          0,
        );
        for (const item of items) {
          if (!item.isDirectory) continue;
          foldersLoad.push({
            storageId,
            folderId: item.id,
            folderName: item.name,
            childrenCount: item.childrenCount ?? 0,
            filesCount: item.filesCount ?? 0,
            foldersCount: item.foldersCount ?? 0,
          });
        }
      }

      storageUsageByUser.push({
        userId: user.id,
        email: user.email,
        usedBytes: totalBytes,
      });
    }

    const uploadLeaders = users
      .map((user) => ({
        userId: user.id,
        email: user.email,
        uploads: uploadsByUser.get(user.id) ?? 0,
      }))
      .sort((a, b) => b.uploads - a.uploads)
      .slice(0, top);

    const suspiciousTraffic = users
      .map((user) => {
        const requests = requestsByUser.get(user.id) ?? 0;
        const errors = errorsByUser.get(user.id) ?? 0;
        const uniqueIps = ipsByUser.get(user.id)?.size ?? 0;
        const errorRate = requests > 0 ? errors / requests : 0;
        const score = requests * (1 + errorRate) + uniqueIps * 20;
        return {
          userId: user.id,
          email: user.email,
          requests,
          errors,
          errorRate: Number(errorRate.toFixed(3)),
          uniqueIps,
          suspiciousScore: Math.round(score),
        };
      })
      .sort((a, b) => b.suspiciousScore - a.suspiciousScore)
      .slice(0, top);

    const mostLoadedFolders = foldersLoad
      .sort((a, b) => b.childrenCount - a.childrenCount || b.filesCount - a.filesCount)
      .slice(0, top);

    const inactiveThreshold = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const inactiveAccounts = users
      .filter((user) => {
        const last = lastActivityByUser.get(user.id);
        return !last || last < inactiveThreshold;
      })
      .map((user) => ({
        userId: user.id,
        email: user.email,
        lastActivityAt: lastActivityByUser.get(user.id)?.toISOString() ?? null,
      }))
      .slice(0, top);

    return {
      periodDays: days,
      generatedAt: new Date().toISOString(),
      storageUsageTop: storageUsageByUser.sort((a, b) => b.usedBytes - a.usedBytes).slice(0, top),
      uploadLeaders,
      suspiciousTraffic,
      mostLoadedFolders,
      inactiveAccounts,
    };
  }
}
