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
  newParentId?: string | null;
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
    
    // Маппим в DTO формат
    return {
      id: storageId,
      items: [],
      createdAt: storage.createdAt?.toISOString() || new Date().toISOString(),
      maxBytes: storage.maxBytes || 1024,
    };
  }

  async createItemInStorage(params: CreateItemParams): Promise<StorageItem> {
    const { storageId, userId, name, isDirectory, parentId, fileId } = params;

    // Permission check is performed in main-app before calling this service

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
      userId,
    );

    return item;
  }

  async getStorageById(storageId: string) {
    const storage = await this.storageModel.findById(storageId).lean().exec();
    if (!storage) {
      return null;
    }
    return {
      id: storage._id.toString(),
      items: [],
      createdAt: storage.createdAt?.toISOString() || new Date().toISOString(),
      maxBytes: storage.maxBytes || 1024,
    };
  }

  async getStoragesByIds(storageIds: string[]) {
    if (storageIds.length === 0) {
      return [];
    }
    const storages = await this.storageModel
      .find({ _id: { $in: storageIds } })
      .lean()
      .exec();
    return storages.map((storage) => ({
      id: storage._id.toString(),
      items: [],
      createdAt: storage.createdAt?.toISOString() || new Date().toISOString(),
      maxBytes: storage.maxBytes || 1024,
    }));
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

  async getFullStorageStructure(storageId: string, userId: number): Promise<StorageItem[]> {
    // Permission check is performed in main-app before calling this service

    const items = await this.storageItemService.getAllItemsByStorageId(storageId);

    return items;
  }

  async getStorageStructure(params: GetStorageItemsParams): Promise<StorageItem[]> {
    // Permission check is performed in main-app before calling this service

    const items = await this.storageItemService.getItemsByParent(params.parentId);

    return items;
  }

  async deleteStorageItem(params: DeleteStorageItemParams) {
    // Permission check is performed in main-app before calling this service

    const item = await this.storageItemService.getItemById(params.itemId);

    if (item.storageId !== params.storageId) {
      throw new ForbiddenException('Invalid storage item or ownership mismatch.');
    }

    // Изменено на soft delete для поддержки корзины
    await this.storageItemService.softDeleteItem(params.itemId);

    return { success: true, itemId: params.itemId };
  }

  async restoreStorageItem(params: DeleteStorageItemParams) {
    const item = await this.storageItemService.getItemById(params.itemId);

    if (item.storageId !== params.storageId) {
      throw new ForbiddenException('Invalid storage item or ownership mismatch.');
    }

    await this.storageItemService.restoreItem(params.itemId, params.newParentId);

    return { success: true, itemId: params.itemId };
  }

  async permanentDeleteStorageItem(params: DeleteStorageItemParams) {
    const item = await this.storageItemService.getItemById(params.itemId);

    if (item.storageId !== params.storageId) {
      throw new ForbiddenException('Invalid storage item or ownership mismatch.');
    }

    await this.storageItemService.deleteItem(params.itemId);

    return { success: true, itemId: params.itemId };
  }

  async getTrashItems(storageId: string) {
    const items = await this.storageItemService.getTrashItems(storageId);

    // Маппим в DTO формат
    return items.map((item) => ({
      id: item._id.toString(),
      userId: item.userId,
      name: item.name,
      storageId: item.storageId,
      isDirectory: item.isDirectory,
      parentId: item.parentId?.toString() || null,
      fileId: item.fileId?.toString() || null,
      creatorId: item.creatorId,
      tags: item.tags || [],
      deletedAt: item.deletedAt,
    }));
  }

  async updateStorageItemTags(storageId: string, itemId: string, tags: string[]) {
    // Permission check is performed in main-app before calling this service

    const item = await this.storageItemService.getItemById(itemId);

    if (item.storageId !== storageId) {
      throw new ForbiddenException('Invalid storage item or ownership mismatch.');
    }

    const updatedItem = await this.storageItemService.updateItemTags(itemId, tags);

    // Маппим в DTO формат
    return {
      id: updatedItem._id.toString(),
      userId: updatedItem.userId,
      name: updatedItem.name,
      storageId: updatedItem.storageId,
      isDirectory: updatedItem.isDirectory,
      parentId: updatedItem.parentId?.toString() || null,
      fileId: updatedItem.fileId?.toString() || null,
      creatorId: updatedItem.creatorId,
      tags: updatedItem.tags || [],
      deletedAt: updatedItem.deletedAt,
    };
  }

  async searchStorageItems(params: {
    storageIds: string[];
    query?: string;
    tags?: string[];
    creatorId?: number;
    limit?: number;
    offset?: number;
  }) {
    // Permission check is performed in main-app before calling this service

    const items = await this.storageItemService.searchItems(params);

    // Маппим в DTO формат
    return items.map((item) => ({
      id: item._id.toString(),
      userId: item.userId,
      name: item.name,
      storageId: item.storageId,
      isDirectory: item.isDirectory,
      parentId: item.parentId?.toString() || null,
      fileId: item.fileId?.toString() || null,
      creatorId: item.creatorId,
      tags: item.tags || [],
    }));
  }
}

