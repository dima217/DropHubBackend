import { ResourceType } from '@application/permission/entities/permission.entity';
import { UniversalPermissionService } from '@application/permission/services/permission.service';
import { StorageItemResponseDto } from '../dto/responses/storage-item-response.dto';
import { StorageClientService } from '../../file-client/services/storage-client.service';
import { BadRequestException, Injectable } from '@nestjs/common';
import { StorageItemDto } from '@application/file-client/types/storage';
import { UsersService } from '@application/user/services/user.service';

@Injectable()
export class SharedService {
  constructor(
    private readonly permissionService: UniversalPermissionService,
    private readonly storageClient: StorageClientService,
    private readonly userService: UsersService,
  ) {}

  async getSharedItems(userId: number): Promise<StorageItemResponseDto[]> {
    const permissions = await this.permissionService.getPermissionsByUserIdAndType(
      userId,
      ResourceType.SHARED,
    );
    const itemIds = permissions.map((permission) => permission.resourceId);
    const items = await this.storageClient.getItemsByIds(itemIds);
    const creatorIds = Array.from(
      new Set(
        items
          .map((item) => item.fileMeta?.creatorId ?? item.creatorId)
          .filter((id): id is number => typeof id === 'number'),
      ),
    );

    const creators = creatorIds.length > 0 ? await this.userService.getUsersByIds(creatorIds) : [];

    return items.map((item) => {
      const permission = permissions.find((permission) => permission.resourceId === item.id);
      const effectiveCreatorId = item.fileMeta?.creatorId ?? item.creatorId;
      const creatorUser = effectiveCreatorId
        ? creators.find((creator) => creator.id === effectiveCreatorId)
        : undefined;

      return {
        ...item,
        userRole: permission?.role,
        creator: creatorUser
          ? {
              id: creatorUser.id,
              email: creatorUser.email,
              profile: creatorUser.profile
                ? {
                    id: creatorUser.profile.id,
                    firstName: creatorUser.profile.firstName,
                    avatarUrl: creatorUser.profile.avatarUrl,
                  }
                : null,
            }
          : null,
      };
    });
  }

  async isItemInStorage(itemId: string, storageId: string): Promise<boolean> {
    const item = await this.storageClient.getItemsByIds([itemId]);
    return item[0]?.storageId === storageId;
  }

  async getSharedItemStructure(
    storageId: string,
    parentId: string | null,
    resourceId: string,
    userId: number,
  ): Promise<StorageItemResponseDto[]> {
    const items = await this.storageClient.getSharedItemStructure({
      storageId,
      parentId,
      resourceId,
      userId,
    });
    return this.attachFileStats(items);
  }

  async getSharedItemParticipants(itemId: string) {
    return this.permissionService.getResourceParticipants(
      itemId,
      ResourceType.SHARED,
      this.userService,
    );
  }

  async assertSharedNodeAccess(
    storageId: string,
    resourceId: string,
    nodeId: string,
    userId: number,
  ): Promise<void> {
    await this.getSharedItemStructure(storageId, nodeId, resourceId, userId);
  }

  async assertSharedMutationScope(params: {
    storageId: string;
    resourceId: string;
    userId: number;
    itemId?: string;
    parentId?: string | null;
    targetParentId?: string | null;
    newParentId?: string | null;
  }): Promise<void> {
    const { storageId, resourceId, userId, itemId, parentId, targetParentId, newParentId } = params;

    const isResourceInStorage = await this.isItemInStorage(resourceId, storageId);
    if (!isResourceInStorage) {
      throw new BadRequestException('Shared resource does not belong to this storage');
    }

    if (itemId) {
      await this.assertSharedNodeAccess(storageId, resourceId, itemId, userId);
    }

    if (parentId) {
      await this.assertSharedNodeAccess(storageId, resourceId, parentId, userId);
    }

    if (targetParentId) {
      await this.assertSharedNodeAccess(storageId, resourceId, targetParentId, userId);
    }

    if (newParentId) {
      await this.assertSharedNodeAccess(storageId, resourceId, newParentId, userId);
    }
  }

  async attachSharedParticipantsToOwnedItems(
    items: StorageItemDto[],
    ownerUserId: number,
  ): Promise<StorageItemResponseDto[]> {
    if (items.length === 0) {
      return [];
    }

    const itemIds = items.map((item) => item.id);
    const permissions = await this.permissionService.getPermissionsByResources(
      itemIds,
      ResourceType.SHARED,
    );
    const targetPermissions = permissions.filter((permission) => permission.user.id !== ownerUserId);
    const targetUserIds = Array.from(new Set(targetPermissions.map((permission) => permission.user.id)));
    const users = targetUserIds.length > 0 ? await this.userService.getUsersByIds(targetUserIds) : [];

    const participantsByItem = new Map<string, StorageItemResponseDto['sharedWith']>();
    for (const permission of targetPermissions) {
      const user = users.find((candidate) => candidate.id === permission.user.id);
      const nextParticipant = {
        userId: permission.user.id,
        role: permission.role,
        email: user?.email ?? null,
        profile: user?.profile
          ? {
              firstName: user.profile.firstName,
              avatarUrl: user.profile.avatarUrl,
            }
          : null,
      };
      const existing = participantsByItem.get(permission.resourceId) ?? [];
      existing.push(nextParticipant);
      participantsByItem.set(permission.resourceId, existing);
    }

    return items.map((item) => ({
      ...this.withFileStats(item),
      sharedWith: participantsByItem.get(item.id) ?? [],
    }));
  }

  attachFileStats(items: StorageItemDto[]): StorageItemResponseDto[] {
    return items.map((item) => this.withFileStats(item));
  }

  private withFileStats(item: StorageItemDto): StorageItemResponseDto {
    return {
      ...item,
      ...(item.isDirectory
        ? {}
        : {
            downloadCount: item.fileMeta?.downloadCount ?? 0,
            size: item.fileMeta?.size ?? 0,
          }),
    };
  }

}
