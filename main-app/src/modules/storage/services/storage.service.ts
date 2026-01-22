import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { StorageClientService } from '../../file-client/services/storage-client.service';
import { UniversalPermissionService } from '../../permission/services/permission.service';
import { ResourceType, AccessRole } from '../../permission/entities/permission.entity';
import { UsersService } from '../../user/services/user.service';

@Injectable()
export class StorageService {
  constructor(
    private readonly storageClient: StorageClientService,
    private readonly permissionService: UniversalPermissionService,
    private readonly userService: UsersService,
  ) {}

  async createStorage(userId: number) {
    // Проверяем, есть ли у пользователя уже storage
    const existingPermissions = await this.permissionService.getPermissionsByUserIdAndType(
      userId,
      ResourceType.STORAGE,
    );

    if (existingPermissions.length > 0) {
      throw new ConflictException('User already has a storage. Only one storage per user is allowed.');
    }

    // Создаем storage в file-service
    const storage = await this.storageClient.createStorage(userId);
    const storageId = storage.id;

    // Создаем разрешение ADMIN для владельца storage
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
    // Проверяем доступ пользователя к storage
    await this.permissionService.verifyUserAccess(userId, storageId, ResourceType.STORAGE, [
      AccessRole.ADMIN,
      AccessRole.WRITE,
    ]);

    // Создаем item в storage
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
    // Получаем все разрешения пользователя для storage
    const permissions = await this.permissionService.getPermissionsByUserIdAndType(
      userId,
      ResourceType.STORAGE,
    );

    if (permissions.length === 0) {
      return [];
    }

    // Получаем ID всех storage, к которым у пользователя есть доступ
    const storageIds = permissions.map((p) => p.resourceId);

    // Получаем данные storage из file-service
    const storages = await this.storageClient.getStoragesByIds(storageIds);

    // Возвращаем storage с информацией о роли пользователя
    return storages.map((storage) => {
      const permission = permissions.find((p) => p.resourceId === storage.id);
      return {
        ...storage,
        userRole: permission?.role,
      };
    });
  }

  async getStorageParticipants(userId: number, storageId: string) {
    // Проверяем доступ пользователя к storage
    await this.permissionService.verifyUserAccess(userId, storageId, ResourceType.STORAGE, [
      AccessRole.ADMIN,
      AccessRole.READ,
      AccessRole.WRITE,
    ]);

    // Используем общий метод для получения участников
    return this.permissionService.getResourceParticipants(
      storageId,
      ResourceType.STORAGE,
      this.userService,
    );
  }
}

