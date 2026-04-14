import { Injectable, Logger } from '@nestjs/common';
import { UniversalPermissionService } from '@application/permission/services/permission.service';
import { AccessRole, ResourceType } from '@application/permission/entities/permission.entity';
import { UsersService } from '@application/user/services/user.service';
import { NotificationService } from '@application/user/services/notification.service';
import { FcmService } from './fcm.service';

const dataStr = (v: string | undefined) => (v === undefined ? '' : String(v));

@Injectable()
export class PushEventsService {
  private readonly logger = new Logger(PushEventsService.name);

  constructor(
    private readonly fcm: FcmService,
    private readonly users: UsersService,
    private readonly permissions: UniversalPermissionService,
    private readonly notifications: NotificationService,
  ) {}

  /** Other room participants (not uploader) — new file in room */
  async notifyRoomFileUploaded(roomId: string, actorUserId: number): Promise<void> {
    await this.safe(async () => {
      const perms = await this.permissions.getPermissionsByResource(roomId, ResourceType.ROOM);
      const recipientIds = [
        ...new Set(perms.map((p) => p.user.id).filter((id) => id !== actorUserId)),
      ];
      if (recipientIds.length === 0) return;
      const actor = await this.users.getUserById(actorUserId);
      const name = actor?.profile?.firstName?.trim() || 'Someone';
      await this.sendToUserIds(recipientIds, 'DropHub', `${name} added a file to the room`, {
        type: 'room_file',
        roomId: dataStr(roomId),
      });
    });
  }

  /** User granted access to a shared folder item */
  async notifySharedAccessGranted(
    granterUserId: number,
    targetUserId: number,
    resourceId: string,
  ): Promise<void> {
    await this.safe(async () => {
      const granter = await this.users.getUserById(granterUserId);
      const name = granter?.profile?.firstName?.trim() || 'Someone';
      await this.sendToUserIds([targetUserId], 'DropHub', `${name} shared a folder with you`, {
        type: 'shared_grant',
        resourceId: dataStr(resourceId),
      });
    });
  }

  /**
   * Upload into a shared tree: notify storage admins (owners) and other participants on the shared resource,
   * except the uploader.
   */
  async notifySharedFolderUpload(
    storageId: string,
    sharedResourceId: string,
    actorUserId: number,
  ): Promise<void> {
    await this.safe(async () => {
      const storagePerms = await this.permissions.getPermissionsByResource(
        storageId,
        ResourceType.STORAGE,
      );
      const sharedPerms = await this.permissions.getPermissionsByResource(
        sharedResourceId,
        ResourceType.SHARED,
      );

      const targetIds = new Set<number>();
      for (const p of storagePerms) {
        if (p.role === AccessRole.ADMIN && p.user.id !== actorUserId) {
          targetIds.add(p.user.id);
        }
      }
      for (const p of sharedPerms) {
        if (p.user.id !== actorUserId) {
          targetIds.add(p.user.id);
        }
      }

      if (targetIds.size === 0) return;
      const actor = await this.users.getUserById(actorUserId);
      const name = actor?.profile?.firstName?.trim() || 'Someone';
      await this.sendToUserIds(
        [...targetIds],
        'DropHub',
        `${name} uploaded a file to a shared folder`,
        {
          type: 'shared_upload',
          storageId: dataStr(storageId),
          resourceId: dataStr(sharedResourceId),
        },
      );
    });
  }

  private async sendToUserIds(
    userIds: number[],
    title: string,
    body: string,
    data: Record<string, string>,
  ): Promise<void> {
    if (userIds.length === 0) return;
    const type = data.type ?? 'generic';
    await this.notifications.createMany(
      userIds.map((userId) => ({
        userId,
        type,
        title,
        body,
        data,
      })),
    );

    if (!this.fcm.isEnabled) return;
    const users = await this.users.getUsersByIds(userIds);
    const tokens = users.map((u) => u.fcmToken).filter((t): t is string => !!t?.trim());
    if (tokens.length === 0) return;
    await this.fcm.sendToTokens(tokens, title, body, data);
  }

  private async safe(run: () => Promise<void>): Promise<void> {
    try {
      await run();
    } catch (e) {
      this.logger.warn(`Push event failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}
