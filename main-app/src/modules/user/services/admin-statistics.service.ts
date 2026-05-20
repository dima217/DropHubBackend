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
    const authErrorsByUser = new Map<number, number>();
    const forbiddensByUser = new Map<number, number>();
    const ipsByUser = new Map<number, Set<string>>();
    const agentsByUser = new Map<number, Set<string>>();
    const pathsByUser = new Map<number, Set<string>>();
    const logTimesByUser = new Map<number, Date[]>();
    const lastActivityByUser = new Map<number, Date>();

    for (const log of logs) {
      if (!log.userId) continue;
      const uid = log.userId;

      requestsByUser.set(uid, (requestsByUser.get(uid) ?? 0) + 1);

      if (log.statusCode === 401) {
        authErrorsByUser.set(uid, (authErrorsByUser.get(uid) ?? 0) + 1);
      }
      if (log.statusCode === 403) {
        forbiddensByUser.set(uid, (forbiddensByUser.get(uid) ?? 0) + 1);
      }

      if (log.ip) {
        if (!ipsByUser.has(uid)) ipsByUser.set(uid, new Set());
        ipsByUser.get(uid)!.add(log.ip);
      }

      if (log.userAgent) {
        if (!agentsByUser.has(uid)) agentsByUser.set(uid, new Set());
        agentsByUser.get(uid)!.add(log.userAgent);
      }

      const pathKey = `${log.method}:${log.path.replace(/\/[0-9a-f-]{8,}/gi, '/:id')}`;
      if (!pathsByUser.has(uid)) pathsByUser.set(uid, new Set());
      pathsByUser.get(uid)!.add(pathKey);

      if (!logTimesByUser.has(uid)) logTimesByUser.set(uid, []);
      logTimesByUser.get(uid)!.push(log.createdAt);

      const prev = lastActivityByUser.get(uid);
      if (!prev || log.createdAt > prev) {
        lastActivityByUser.set(uid, log.createdAt);
      }

      if (
        log.path.includes('/upload/') &&
        (log.path.includes('/confirm') || log.path.includes('/multipart/complete')) &&
        log.statusCode < 400
      ) {
        uploadsByUser.set(uid, (uploadsByUser.get(uid) ?? 0) + 1);
      }
    }

    const BURST_WINDOW_MS = 60_000;
    const burstByUser = new Map<number, number>();
    for (const [uid, times] of logTimesByUser) {
      const sorted = times.slice().sort((a, b) => a.getTime() - b.getTime());
      let maxBurst = 0;
      let left = 0;
      for (let right = 0; right < sorted.length; right++) {
        while (sorted[right].getTime() - sorted[left].getTime() > BURST_WINDOW_MS) left++;
        maxBurst = Math.max(maxBurst, right - left + 1);
      }
      burstByUser.set(uid, maxBurst);
    }

    const userPermissions = await Promise.all(
      users.map((user) =>
        this.permissionService
          .getPermissionsByUserIdAndType(user.id, ResourceType.STORAGE)
          .then((perms) => ({ userId: user.id, perms })),
      ),
    );

    const allStorageIds = Array.from(
      new Set(
        userPermissions.flatMap(({ perms }) =>
          perms
            .filter((p) => p.role === AccessRole.ADMIN)
            .map((p) => p.resourceId),
        ),
      ),
    );

    const storagesBatch =
      allStorageIds.length > 0
        ? await this.storageClient.getStoragesByIds(allStorageIds)
        : [];

    const usedBytesByStorageId = new Map(
      storagesBatch.map((s) => [s.id, s.usedBytes]),
    );

    const storageIdsByUser = new Map<number, string[]>();
    for (const { userId, perms } of userPermissions) {
      storageIdsByUser.set(
        userId,
        Array.from(
          new Set(
            perms.filter((p) => p.role === AccessRole.ADMIN).map((p) => p.resourceId),
          ),
        ),
      );
    }

    const storageUsageByUser: Array<{ userId: number; email: string; usedBytes: number }> =
      users.map((user) => ({
        userId: user.id,
        email: user.email,
        usedBytes: (storageIdsByUser.get(user.id) ?? []).reduce(
          (sum, sid) => sum + (usedBytesByStorageId.get(sid) ?? 0),
          0,
        ),
      }));

    const foldersLoad: Array<{
      storageId: string;
      folderId: string;
      folderName: string;
      childrenCount: number;
      filesCount: number;
      foldersCount: number;
    }> = [];

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
        const authErrors = authErrorsByUser.get(user.id) ?? 0;
        const forbiddens = forbiddensByUser.get(user.id) ?? 0;
        const uniqueIps = ipsByUser.get(user.id)?.size ?? 0;
        const uniqueAgents = agentsByUser.get(user.id)?.size ?? 0;
        const uniquePaths = pathsByUser.get(user.id)?.size ?? 0;
        const peakPerMinute = burstByUser.get(user.id) ?? 0;

        // Rate-based signals: not affected by total request volume.
        // All rates require a minimum of 20 requests to avoid noise
        // from users with 1-2 actions.
        const MIN_REQ = 20;
        const authErrorRate = requests >= MIN_REQ ? authErrors / requests : 0;
        const forbiddenRate = requests >= MIN_REQ ? forbiddens / requests : 0;
        // Path density: unique endpoints / total requests.
        // Near 1.0 = every request goes to a new endpoint (scanner).
        // Near 0.0 = same endpoints used repeatedly (normal usage).
        const pathDensity = requests >= MIN_REQ ? uniquePaths / requests : 0;

        // Score grows only above the threshold so that moderate error
        // rates (normal session expiry, occasional wrong click) add nothing.
        // rate * 100 gives a percentage value; multiplied by weight.
        const authErrorScore =
          authErrorRate > 0.05 && authErrors >= 10
            ? Math.round(authErrorRate * 100) * 4
            : 0;
        const forbiddenScore =
          forbiddenRate > 0.05 && forbiddens >= 5
            ? Math.round(forbiddenRate * 100) * 3
            : 0;
        // Peak burst: already a rate (req/min), volume-independent.
        const burstScore = Math.max(0, peakPerMinute - 30) * 3;
        // Path density above 0.5 means more than half of all requests
        // hit a unique endpoint — characteristic of API enumeration.
        const enumerationScore =
          pathDensity > 0.5 && uniquePaths > 10
            ? Math.round(pathDensity * 100) * 2
            : 0;
        // Many IPs is only suspicious when combined with auth/forbidden errors.
        const ipScore =
          uniqueIps > 2 && authErrors + forbiddens > 5 ? uniqueIps * 5 : 0;
        // Agent rotation is an absolute count — having 4+ distinct
        // user-agents doesn't scale with usage volume.
        const agentScore = uniqueAgents > 3 ? (uniqueAgents - 1) * 8 : 0;

        const suspiciousScore = Math.round(
          authErrorScore + forbiddenScore + burstScore + enumerationScore + ipScore + agentScore,
        );

        const signals: string[] = [];
        if (authErrorRate > 0.05 && authErrors >= 10) signals.push('auth_errors');
        if (forbiddenRate > 0.05 && forbiddens >= 5) signals.push('forbidden_probing');
        if (peakPerMinute > 30) signals.push('request_burst');
        if (pathDensity > 0.5 && uniquePaths > 10) signals.push('path_enumeration');
        if (uniqueIps > 2 && authErrors + forbiddens > 5) signals.push('multi_ip_errors');
        if (uniqueAgents > 3) signals.push('agent_rotation');

        return {
          userId: user.id,
          email: user.email,
          requests,
          authErrors,
          forbiddens,
          uniqueIps,
          uniqueAgents,
          uniquePaths,
          peakRequestsPerMinute: peakPerMinute,
          suspiciousScore,
          signals,
        };
      })
      .filter((u) => u.suspiciousScore > 0)
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
