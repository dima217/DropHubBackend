import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { UserStorageDocument } from "./schemas/storage.schema";
import { Model } from "mongoose";
import { StorageItemService } from "./storage.item.service";
import {
  AccessRole,
  ResourceType,
} from "../permission-client/permission-client.service";
import { PermissionClientService } from "../permission-client/permission-client.service";
import { StorageItem } from "./schemas/storage.item.schema";
import { TokenClientService } from "../token-client/token-client.service";
import { IStorageService } from "./interfaces/storage-service.interface";
import type { IStorageItemService } from "./interfaces";
import { STORAGE_ITEM_SERVICE_TOKEN } from "./interfaces";
import { Inject, forwardRef } from "@nestjs/common";
import type { IFileService } from "../file/interfaces";
import { FILE_SERVICE_TOKEN } from "../file/interfaces";
import {
  StorageItemMapper,
  type EnrichedStorageItemDto,
} from "./mappers/storage-item.mapper";

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

interface MoveStorageItemParams {
  storageId: string;
  itemId: string;
  newParentId: string | null;
  userId: number;
}

@Injectable()
export class StorageService implements IStorageService {
  constructor(
    @InjectModel("UserStorage")
    private readonly storageModel: Model<UserStorageDocument>,
    private readonly permissionClient: PermissionClientService,
    @Inject(STORAGE_ITEM_SERVICE_TOKEN)
    private readonly storageItemService: IStorageItemService,
    private readonly tokenService: TokenClientService,
    @Inject(forwardRef(() => FILE_SERVICE_TOKEN))
    private readonly fileService: IFileService
  ) {}

  async createStorage(userId: number) {
    const storage = await this.storageModel.create({
      createdAt: Date.now(),
    });
    const storageId = storage._id.toString();

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
      throw new BadRequestException("File items must have a fileId.");
    }

    const item = await this.storageItemService.createItem(
      name,
      isDirectory,
      parentId,
      fileId,
      userId.toString(),
      storageId,
      userId
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
      throw new UnauthorizedException("Token is required.");
    }

    const payload = await this.tokenService.validateToken(token);

    if (payload.resourceType !== "storage") {
      throw new ForbiddenException(
        "Token is not valid for accessing storage items."
      );
    }

    if (payload.role !== "R" && payload.role !== "RW") {
      throw new ForbiddenException("Token does not grant read access.");
    }

    const itemId = payload.resourceId;
    const item = await this.storageItemService.getItemById(itemId);

    const responseItem: ItemWithChildren = { ...item };

    if (item.isDirectory) {
      const children = await this.storageItemService.getItemsByParent(
        item._id.toString()
      );

      responseItem.children = children;
    }

    return responseItem;
  }

  private async enrichItemsWithMetadata(
    items: StorageItem[]
  ): Promise<EnrichedStorageItemDto[]> {
    const enrichedItems = await Promise.all(
      items.map(async (item): Promise<EnrichedStorageItemDto> => {
        if (item.isDirectory) {
          const childrenCount = await this.storageItemService.getChildrenCount(
            item._id.toString()
          );
          return StorageItemMapper.toDirectoryDto(item, childrenCount);
        } else {
          if (item.fileId) {
            try {
              const fileMeta = await this.fileService.getFileById(
                item.fileId.toString()
              );
              return StorageItemMapper.toFileDto(item, fileMeta);
            } catch (error) {
              return StorageItemMapper.toFileDto(item);
            }
          }
          return StorageItemMapper.toFileDto(item);
        }
      })
    );

    return enrichedItems;
  }

  async getFullStorageStructure(
    storageId: string,
    userId: number
  ): Promise<EnrichedStorageItemDto[]> {
    // Permission check is performed in main-app before calling this service

    const items =
      await this.storageItemService.getAllItemsByStorageId(storageId);

    return this.enrichItemsWithMetadata(items);
  }

  async getStorageStructure(
    params: GetStorageItemsParams
  ): Promise<EnrichedStorageItemDto[]> {
    const items = await this.storageItemService.getItemsByParent(
      params.parentId,
      params.storageId
    );

    return this.enrichItemsWithMetadata(items);
  }

  async deleteStorageItem(params: DeleteStorageItemParams) {
    const item = await this.storageItemService.getItemById(params.itemId);

    if (item.storageId !== params.storageId) {
      throw new ForbiddenException(
        "Invalid storage item or ownership mismatch."
      );
    }

    await this.storageItemService.softDeleteItem(params.itemId);

    return { success: true, itemId: params.itemId };
  }

  async restoreStorageItem(params: DeleteStorageItemParams) {
    const item = await this.storageItemService.getItemById(params.itemId);

    if (item.storageId !== params.storageId) {
      throw new ForbiddenException(
        "Invalid storage item or ownership mismatch."
      );
    }

    await this.storageItemService.restoreItem(
      params.itemId,
      params.newParentId
    );

    return { success: true, itemId: params.itemId };
  }

  async permanentDeleteStorageItem(params: DeleteStorageItemParams) {
    const item = await this.storageItemService.getItemById(params.itemId);

    if (item.storageId !== params.storageId) {
      throw new ForbiddenException(
        "Invalid storage item or ownership mismatch."
      );
    }

    await this.storageItemService.deleteItem(params.itemId);

    return { success: true, itemId: params.itemId };
  }

  async getTrashItems(storageId: string) {
    const items = await this.storageItemService.getTrashItems(storageId);
    return items.map((item) => StorageItemMapper.toBaseDto(item));
  }

  async updateStorageItemTags(
    storageId: string,
    itemId: string,
    tags: string[]
  ) {
    // Permission check is performed in main-app before calling this service

    const item = await this.storageItemService.getItemById(itemId);

    if (item.storageId !== storageId) {
      throw new ForbiddenException(
        "Invalid storage item or ownership mismatch."
      );
    }

    const updatedItem = await this.storageItemService.updateItemTags(
      itemId,
      tags
    );
    return StorageItemMapper.toBaseDto(updatedItem);
  }

  async moveStorageItem(params: MoveStorageItemParams) {
    const item = await this.storageItemService.getItemById(params.itemId);

    if (item.storageId !== params.storageId) {
      throw new ForbiddenException(
        "Invalid storage item or ownership mismatch."
      );
    }

    const updatedItem = await this.storageItemService.moveItem(
      params.itemId,
      params.newParentId
    );
    return StorageItemMapper.toBaseDto(updatedItem);
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
    return items.map((item) => StorageItemMapper.toBaseDto(item));
  }

  async renameStorageItem(params: {
    storageId: string;
    itemId: string;
    newName: string;
    userId: number;
  }) {
    const item = await this.storageItemService.getItemById(params.itemId);

    if (item.storageId !== params.storageId) {
      throw new ForbiddenException(
        "Invalid storage item or ownership mismatch."
      );
    }

    const updatedItem = await this.storageItemService.renameItem(
      params.itemId,
      params.newName
    );
    return StorageItemMapper.toBaseDto(updatedItem);
  }

  async copyStorageItem(params: {
    storageId: string;
    itemId: string;
    targetParentId: string | null;
    userId: number;
  }) {
    const item = await this.storageItemService.getItemById(params.itemId);

    if (item.storageId !== params.storageId) {
      throw new ForbiddenException(
        "Invalid storage item or ownership mismatch."
      );
    }

    const copiedItem = await this.storageItemService.copyItem(
      params.itemId,
      params.targetParentId,
      params.userId.toString(),
      params.storageId
    );
    return StorageItemMapper.toBaseDto(copiedItem);
  }
}
