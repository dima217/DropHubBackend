import { Injectable, ConflictException } from '@nestjs/common';
import { StorageClientService } from '../../file-client/services/storage-client.service';
import { UniversalPermissionService } from '../../permission/services/permission.service';
import { ResourceType, AccessRole } from '../../permission/entities/permission.entity';
import { UsersService } from '../../user/services/user.service';
import { StorageItemDto } from '../../file-client/types/storage';

@Injectable()
export class StorageService {
  constructor(
    private readonly storageClient: StorageClientService,
    private readonly permissionService: UniversalPermissionService,
    private readonly userService: UsersService,
  ) {}

  async createStorage(userId: number) {
    const existingPermissions = await this.permissionService.getPermissionsByUserIdAndType(
      userId,
      ResourceType.STORAGE,
    );

    if (existingPermissions.length > 0) {
      throw new ConflictException(
        'User already has a storage. Only one storage per user is allowed.',
      );
    }

    const storage = await this.storageClient.createStorage(userId);
    const storageId = storage.id;

    await this.permissionService.createPermission({
      userId,
      resourceId: storageId,
      resourceType: ResourceType.STORAGE,
      role: AccessRole.ADMIN,
    });

    return { success: true, storageId, storage };
  }

  async createStorageItem(
    userId: number,
    storageId: string,
    name: string,
    isDirectory: boolean,
    parentId: string | null,
    fileId: string | null,
  ) {
    await this.permissionService.verifyUserAccess(userId, storageId, ResourceType.STORAGE, [
      AccessRole.ADMIN,
      AccessRole.WRITE,
    ]);

    const item = await this.storageClient.createStorageItem({
      storageId,
      userId,
      name,
      isDirectory,
      parentId,
      fileId,
    });

    return { success: true, item };
  }

  async getStoragesByUserId(userId: number) {
    const permissions = await this.permissionService.getPermissionsByUserIdAndType(
      userId,
      ResourceType.STORAGE,
    );

    if (permissions.length === 0) {
      return [];
    }

    const storageIds = permissions.map((p) => p.resourceId);

    const storages = await this.storageClient.getStoragesByIds(storageIds);

    return storages.map((storage) => {
      const permission = permissions.find((p) => p.resourceId === storage.id);
      return {
        ...storage,
        userRole: permission?.role,
      };
    });
  }

  async getStorageParticipants(userId: number, storageId: string) {
    await this.permissionService.verifyUserAccess(userId, storageId, ResourceType.STORAGE, [
      AccessRole.ADMIN,
      AccessRole.READ,
      AccessRole.WRITE,
    ]);

    return this.permissionService.getResourceParticipants(
      storageId,
      ResourceType.STORAGE,
      this.userService,
    );
  }

  async updateStorageItemTags(
    userId: number,
    storageId: string,
    itemId: string,
    tags: string[],
  ): Promise<{ success: boolean; item: StorageItemDto }> {
    await this.permissionService.verifyUserAccess(userId, storageId, ResourceType.STORAGE, [
      AccessRole.ADMIN,
      AccessRole.WRITE,
    ]);

    const item = await this.storageClient.updateStorageItemTags(storageId, itemId, tags);

    return { success: true, item };
  }
}
