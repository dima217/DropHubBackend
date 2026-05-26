import { Injectable, Logger } from '@nestjs/common';
import { UniversalPermissionService } from '@application/permission/services/permission.service';
import { AccessRole, ResourceType } from '@application/permission/entities/permission.entity';
import { UsersService } from '@application/user/services/user.service';
import { NotificationService } from '@application/user/services/notification.service';
import {
  buildNotificationContent,
  NotificationType,
  resolveActorName,
} from '@application/user/constants/notification-types';
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
      const actorName = resolveActorName(actor?.profile?.firstName);
      await this.sendToUserIds(recipientIds, NotificationType.ROOM_FILE, actorUserId, actorName, {
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
      const actorName = resolveActorName(granter?.profile?.firstName);
      await this.sendToUserIds(
        [targetUserId],
        NotificationType.SHARED_GRANT,
        granterUserId,
        actorName,
        { resourceId: dataStr(resourceId) },
      );
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
      const actorName = resolveActorName(actor?.profile?.firstName);
      await this.sendToUserIds(
        [...targetIds],
        NotificationType.SHARED_UPLOAD,
        actorUserId,
        actorName,
        {
          storageId: dataStr(storageId),
          resourceId: dataStr(sharedResourceId),
        },
      );
    });
  }

  private async sendToUserIds(
    userIds: number[],
    type: NotificationType,
    actorUserId: number,
    actorName: string,
    data: Record<string, string>,
  ): Promise<void> {
    if (userIds.length === 0) return;

    const resolvedActorName = resolveActorName(actorName);
    const { title, body } = buildNotificationContent(type, { actorName: resolvedActorName });
    const enrichedData: Record<string, string> = {
      ...data,
      type,
      actorName: resolvedActorName,
      actorUserId: String(actorUserId),
    };

    await this.notifications.createMany(
      userIds.map((userId) => ({
        userId,
        type,
        title,
        body,
        data: enrichedData,
      })),
    );

    if (!this.fcm.isEnabled) return;
    const users = await this.users.getUsersByIds(userIds);
    const tokens = users.map((u) => u.fcmToken).filter((t): t is string => !!t?.trim());
    if (tokens.length === 0) return;
    await this.fcm.sendToTokens(tokens, title, body, enrichedData);
  }

  private async safe(run: () => Promise<void>): Promise<void> {
    try {
      await run();
    } catch (e) {
      this.logger.warn(`Push event failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}
