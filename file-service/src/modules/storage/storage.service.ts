import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { UserStorageDocument } from './schemas/storage.schema';
import { Model } from 'mongoose';
import { StorageItemService } from './storage.item.service';
import { AccessRole, ResourceType } from '../permission-client/permission-client.service';
import { PermissionClientService } from '../permission-client/permission-client.service';
import { StorageItem } from './schemas/storage.item.schema';
import { TokenClientService } from '../token-client/token-client.service';

interface GetStorageItemsParams {
  storageId: string;
  parentId: string | null;
  userId: number;
}

interface DeleteStorageItemParams {
  storageId: string;
  itemId: string;
  userId: number;
}

interface CreateItemParams {
  storageId: string;
  name: string;
  isDirectory: boolean;
  parentId: string | null;
  fileId: string | null;
  userId: number;
}

interface ItemWithChildren extends StorageItem {
  children?: StorageItem[];
}

@Injectable()
export class StorageService {
  constructor(
    @InjectModel('UserStorage') private readonly storageModel: Model<UserStorageDocument>,
    private readonly permissionClient: PermissionClientService,
    private readonly storageItemService: StorageItemService,
    private readonly tokenService: TokenClientService,
  ) {}

  async createStorage(userId: number) {
    const storage = await this.storageModel.create({
      createdAt: Date.now(),
    });
    const storageId = storage._id.toString();
    
    // Note: Permission creation should be handled by main app
    
    return storage;
  }

  async createItemInStorage(params: CreateItemParams): Promise<StorageItem> {
    const { storageId, userId, name, isDirectory, parentId, fileId } = params;

    await this.permissionClient.verifyUserAccess(userId, storageId, ResourceType.STORAGE, [
      AccessRole.ADMIN,
      AccessRole.WRITE,
    ]);

    if (!isDirectory && !fileId) {
      throw new BadRequestException('File items must have a fileId.');
    }

    const item = await this.storageItemService.createItem(
      name,
      isDirectory,
      parentId,
      fileId,
      userId.toString(),
      storageId,
    );

    return item;
  }

  async getStoragesByUserId(userId: number) {
    // This will need to query permissions from main app via RabbitMQ
    // For now, placeholder
    return [];
  }

  async getStorageItemByToken(token: string): Promise<StorageItem> {
    if (!token) {
      throw new UnauthorizedException('Token is required.');
    }

    const payload = await this.tokenService.validateToken(token);

    if (payload.resourceType !== 'storage') {
      throw new ForbiddenException('Token is not valid for accessing storage items.');
    }

    if (payload.role !== 'R' && payload.role !== 'RW') {
      throw new ForbiddenException('Token does not grant read access.');
    }

    const itemId = payload.resourceId;
    const item = await this.storageItemService.getItemById(itemId);

    const responseItem: ItemWithChildren = { ...item };

    if (item.isDirectory) {
      const children = await this.storageItemService.getItemsByParent(item._id.toString());

      responseItem.children = children;
    }

    return responseItem;
  }

  private async verifyUserAccess(userId: number, storageId: string, requiredRoles: AccessRole[]) {
    await this.permissionClient.verifyUserAccess(
      userId,
      storageId,
      ResourceType.STORAGE,
      requiredRoles,
    );
  }

  async getFullStorageStructure(storageId: string, userId: number): Promise<StorageItem[]> {
    await this.verifyUserAccess(userId, storageId, [
      AccessRole.ADMIN,
      AccessRole.READ,
      AccessRole.WRITE,
    ]);

    const items = await this.storageItemService.getAllItemsByStorageId(storageId);

    return items;
  }

  async getStorageStructure(params: GetStorageItemsParams): Promise<StorageItem[]> {
    await this.verifyUserAccess(params.userId, params.storageId, [
      AccessRole.ADMIN,
      AccessRole.READ,
      AccessRole.WRITE,
    ]);

    const items = await this.storageItemService.getItemsByParent(params.parentId);

    return items;
  }

  async deleteStorageItem(params: DeleteStorageItemParams) {
    await this.verifyUserAccess(params.userId, params.storageId, [
      AccessRole.ADMIN,
      AccessRole.WRITE,
    ]);

    const item = await this.storageItemService.getItemById(params.itemId);

    if (item.storageId !== params.storageId) {
      throw new ForbiddenException('Invalid storage item or ownership mismatch.');
    }

    await this.storageItemService.deleteItem(params.itemId);

    return { success: true, itemId: params.itemId };
  }
}

