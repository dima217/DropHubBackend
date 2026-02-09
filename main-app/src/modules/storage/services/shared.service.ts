import { ResourceType } from '@application/permission/entities/permission.entity';
import { UniversalPermissionService } from '@application/permission/services/permission.service';
import { StorageItemResponseDto } from '../dto/responses/storage-item-response.dto';
import { StorageClientService } from '../../file-client/services/storage-client.service';
import { Injectable } from '@nestjs/common';
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
    return this.storageClient.getItemsByIds(itemIds);
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
  ): Promise<StorageItemDto[]> {
    return this.storageClient.getSharedItemStructure({
      storageId,
      parentId,
      resourceId,
      userId,
    });
  }

  async getSharedItemParticipants(itemId: string) {
    return this.permissionService.getResourceParticipants(
      itemId,
      ResourceType.SHARED,
      this.userService,
    );
  }
}
