import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  Inject,
  forwardRef,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { UserStorageDocument } from "../../schemas/storage.schema";
import { StorageItem } from "../../schemas/storage.item.schema";

import { TokenClientService } from "../../../token-client/token-client.service";
import { PermissionClientService } from "../../../permission-client/permission-client.service";
import { StorageItemQueryService } from "../storage-item/storage-item.query.service";
import { StorageItemCommandService } from "../storage-item/storage-item.command.service";
import { StorageItemTrashService } from "../storage-item/storage-item.trash.service";
import { StorageItemCopyService } from "../storage-item/storage-item.copy.service";
import { StorageItemTreeService } from "../storage-item/storage-item.tree.service";

import type { IStorageService } from "../../interfaces/storage-service.interface";

import type { IFileService } from "../../../file/interfaces";
import { FILE_SERVICE_TOKEN } from "../../../file/interfaces";

import {
  StorageItemMapper,
  type EnrichedStorageItemDto,
} from "../../mappers/storage-item.mapper";

export interface GetStorageItemsParams {
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

export interface CreateSharedItemParams
  extends Omit<CreateItemParams, 'parentId'> {
  resourceId: string;
  parentId: string;
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

    private readonly itemQuery: StorageItemQueryService,
    private readonly itemCommand: StorageItemCommandService,
    private readonly itemTrash: StorageItemTrashService,
    private readonly itemCopy: StorageItemCopyService,
    private readonly itemTree: StorageItemTreeService,

    private readonly tokenService: TokenClientService,

    @Inject(forwardRef(() => FILE_SERVICE_TOKEN))
    private readonly fileService: IFileService
  ) {}
  
  private readonly logger = new Logger(StorageService.name);

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

    const item = await this.itemCommand.createItem(
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

  async createSharedItem(params: CreateSharedItemParams) {
    const { storageId, userId, name, isDirectory, parentId, fileId, resourceId } = params;


    if (!isDirectory && !fileId && !resourceId) {
      throw new BadRequestException("File items must have a fileId.");
    }

    const allowed = await this.itemQuery.isDescendantOrSelf(
      parentId,
      resourceId
    );

    if (!allowed) {
      throw new ForbiddenException('Access denied');
    }

    const item = await this.itemCommand.createItem(
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
      tags: storage.tags || [],
      createdAt: storage.createdAt?.toISOString() || new Date().toISOString(),
      maxBytes: storage.maxBytes || 1024,
    }));
  }

  async getStoragesByUserId(userId: number) {
    // This will need to query permissions from main app via RabbitMQ
    // For now, placeholder
    return [];
  }

  // Реализация временно отсутствует в рамках перехода на новые сервисы.
  // На стороне main-app этот метод сейчас не используется.
  async getStorageItemByToken(token: string): Promise<ItemWithChildren> {
    throw new BadRequestException("getStorageItemByToken is not implemented yet.");
  }

  private async enrichItemsWithMetadata(
    items: StorageItem[]
  ): Promise<EnrichedStorageItemDto[]> {
    const enrichedItems = await Promise.all(
      items.map(async (item): Promise<EnrichedStorageItemDto> => {
        if (item.isDirectory) {
          const childrenCount = await this.itemTree.getChildrenCount(
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

    const items = await this.itemTree.getAllItemsByStorageId(storageId);

    return this.enrichItemsWithMetadata(items);
  }

  async getStorageStructure(
    params: GetStorageItemsParams
  ): Promise<EnrichedStorageItemDto[]> {
    const items = await this.itemQuery.getItemsByParent(
      params.parentId,
      params.storageId
    );

    return this.enrichItemsWithMetadata(items);
  }

  async getStorageStructureWithAccessCheck(
    params: GetStorageItemsParams,
    resourceId: string
  ): Promise<EnrichedStorageItemDto[]> {
    const { parentId } = params;
  
    if (!parentId) {
      throw new ForbiddenException('Access denied');
    }
  
    const allowed = await this.itemQuery.isDescendantOrSelf(
      parentId,
      resourceId
    );
  
    if (!allowed) {
      this.logger.error('Access denied', { parentId, resourceId });
      throw new ForbiddenException('Access denied');
    }
  
    return this.getStorageStructure(params);
  }
  
  async getSharedItems(itemIds: string[]): Promise<EnrichedStorageItemDto[]> {
    const items = await this.itemQuery.getItemsByIds(itemIds);
    return this.enrichItemsWithMetadata(items);
  }

  async deleteStorageItem(params: DeleteStorageItemParams) {
    const item = await this.itemQuery.getItemById(params.itemId);
    if (!item) {
      throw new NotFoundException("Item not found.");
    }

    if (item.storageId !== params.storageId) {
      throw new ForbiddenException(
        "Invalid storage item or ownership mismatch."
      );
    }

    await this.itemTrash.softDelete(params.itemId);

    return { success: true, itemId: params.itemId };
  }

  async restoreStorageItem(params: DeleteStorageItemParams) {
    const item = await this.itemQuery.getItemById(params.itemId);
    if (!item) {
      throw new NotFoundException("Item not found.");
    }

    if (item.storageId !== params.storageId) {
      throw new ForbiddenException(
        "Invalid storage item or ownership mismatch."
      );
    }

    await this.itemTrash.restore(params.itemId, params.newParentId);

    return { success: true, itemId: params.itemId };
  }

  async permanentDeleteStorageItem(params: DeleteStorageItemParams) {
    const item = await this.itemQuery.getItemById(params.itemId);
    if (!item) {
      throw new NotFoundException("Item not found.");
    }

    if (item.storageId !== params.storageId) {
      throw new ForbiddenException(
        "Invalid storage item or ownership mismatch."
      );
    }

    await this.itemTrash.deletePermanent(params.itemId);

    return { success: true, itemId: params.itemId };
  }

  async getTrashItems(storageId: string) {
    const items = await this.itemQuery.getTrashItems(storageId);
    return items.map((item) => StorageItemMapper.toBaseDto(item));
  }

  async updateStorageItemTags(
    storageId: string,
    itemId: string,
    tags: string[]
  ) {
    // Permission check is performed in main-app before calling this service

    const item = await this.itemQuery.getItemById(itemId);
    if (!item) {
      throw new NotFoundException("Item not found.");
    }

    if (item.storageId !== storageId) {
      throw new ForbiddenException(
        "Invalid storage item or ownership mismatch."
      );
    }

    const updatedItem = await this.itemCommand.updateTags(itemId, tags);
    await this.storageModel.updateOne(
      { _id: storageId },
      {
        $addToSet: {
          tags: { $each: tags },
        },
      }
    );
    return StorageItemMapper.toBaseDto(updatedItem);
  }


  async removeStorageTags(
    storageId: string,
    tags: string[]
  ) {
    await this.storageModel.updateOne(
      { _id: storageId },
      {
        $pull: {
          tags: { $in: tags },
        },
      }
    );
    await this.itemCommand.removeTags(storageId, tags);
    return { success: true };
  }

  async moveStorageItem(params: MoveStorageItemParams) {
    const item = await this.itemQuery.getItemById(params.itemId);
    if (!item) {
      throw new NotFoundException("Item not found.");
    }

    if (item.storageId !== params.storageId) {
      throw new ForbiddenException(
        "Invalid storage item or ownership mismatch."
      );
    }

    const updated = await this.itemTree.moveItem(params.itemId, params.newParentId);
    return StorageItemMapper.toBaseDto(updated);
  }

  async searchStorageItems(params: {
    storageIds: string[];
    query?: string;
    tags?: string[];
    creatorId?: number;
    limit?: number;
    mimeType?: string;
    offset?: number;
  }) {

    const items = await this.itemQuery.searchItems(params);
    const enrichedItems = await this.enrichItemsWithMetadata(items);
    return enrichedItems.filter(
      item => item.isDirectory || item.fileMeta?.mimeType === params.mimeType
    );
  }

  async renameStorageItem(params: {
    storageId: string;
    itemId: string;
    newName: string;
    userId: number;
  }) {
    const item = await this.itemQuery.getItemById(params.itemId);
    if (!item) {
      throw new NotFoundException("Item not found.");
    }

    if (item.storageId !== params.storageId) {
      throw new ForbiddenException(
        "Invalid storage item or ownership mismatch."
      );
    }

    const updatedItem = await this.itemCommand.rename(params.itemId, params.newName);
    return StorageItemMapper.toBaseDto(updatedItem as any);
  }

  async copyStorageItem(params: {
    storageId: string;
    itemId: string;
    targetParentId: string | null;
    userId: number;
  }) {
    const item = await this.itemQuery.getItemById(params.itemId);
    if (!item) {
      throw new NotFoundException("Item not found.");
    }

    if (item.storageId !== params.storageId) {
      throw new ForbiddenException(
        "Invalid storage item or ownership mismatch."
      );
    }

    const copiedItem = await this.itemCopy.copyItem(
      params.itemId,
      params.targetParentId,
      params.userId.toString(),
      params.storageId
    );
    return StorageItemMapper.toBaseDto(copiedItem);
  }
}
