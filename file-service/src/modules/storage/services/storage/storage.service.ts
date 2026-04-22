import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Inject,
  forwardRef,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RpcException } from "@nestjs/microservices";
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
import type { AppConfig } from "../../../../config/configuration.interface";

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

    private readonly configService: ConfigService<AppConfig, true>,

    @Inject(forwardRef(() => FILE_SERVICE_TOKEN))
    private readonly fileService: IFileService
  ) {}
  
  private readonly logger = new Logger(StorageService.name);

  private getDefaultMaxBytes(): number {
    return this.configService.get<number>("storageDefaultMaxBytes", 1024 * 1024 * 1024);
  }

  private resolveMaxBytes(storage: { maxBytes?: number } | null | undefined): number {
    const fallback = this.getDefaultMaxBytes();
    if (storage == null || storage.maxBytes == null || storage.maxBytes <= 0) {
      return fallback;
    }
    return storage.maxBytes;
  }

  private async getUsedBytes(storageId: string): Promise<number> {
    const items = await this.itemTree.getAllItemsByStorageId(storageId);
    const fileIds = items
      .filter((i) => !i.isDirectory && i.fileId)
      .map((i) => i.fileId!.toString());
    return this.fileService.sumFilesSizeByIds(fileIds);
  }

  async assertCanAddBytes(storageId: string, additionalBytes: number): Promise<void> {
    if (!Number.isFinite(additionalBytes) || additionalBytes <= 0) {
      return;
    }
    const storage = await this.storageModel.findById(storageId).lean().exec();
    if (!storage) {
      throw new NotFoundException("Storage not found.");
    }
    const maxBytes = this.resolveMaxBytes(storage);
    const usedBytes = await this.getUsedBytes(storageId);
    if (usedBytes + additionalBytes > maxBytes) {
      throw new RpcException({
        code: "STORAGE_QUOTA_EXCEEDED",
        message: `Storage quota exceeded: used ${usedBytes} of ${maxBytes} bytes.`,
      });
    }
  }

  private async sumBytesForStorageItemSubtree(
    itemId: string,
    storageId: string
  ): Promise<number> {
    const item = await this.itemQuery.getItemById(itemId);
    if (!item || item.storageId !== storageId) {
      return 0;
    }
    if (!item.isDirectory && item.fileId) {
      try {
        const meta = await this.fileService.getFileById(item.fileId.toString());
        return Number(meta.size) || 0;
      } catch {
        return 0;
      }
    }
    if (item.isDirectory) {
      const children = await this.itemTree.getChildren(itemId, storageId);
      let sum = 0;
      for (const ch of children) {
        sum += await this.sumBytesForStorageItemSubtree(ch._id.toString(), storageId);
      }
      return sum;
    }
    return 0;
  }

  async createStorage(userId: number) {
    const maxBytes = this.getDefaultMaxBytes();
    const storage = await this.storageModel.create({
      createdAt: Date.now(),
      maxBytes,
    });
    const storageId = storage._id.toString();

    return {
      id: storageId,
      items: [],
      createdAt: storage.createdAt?.toISOString() || new Date().toISOString(),
      maxBytes: this.resolveMaxBytes(storage),
      usedBytes: 0,
    };
  }

  async createItemInStorage(params: CreateItemParams): Promise<StorageItem> {
    const { storageId, userId, name, isDirectory, parentId, fileId } = params;

    // Permission check is performed in main-app before calling this service

    if (!isDirectory && !fileId) {
      throw new BadRequestException("File items must have a fileId.");
    }

    if (!isDirectory && fileId) {
      const meta = await this.fileService.getFileById(fileId);
      await this.assertCanAddBytes(storageId, Number(meta.size) || 0);
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

    if (!isDirectory && fileId) {
      const meta = await this.fileService.getFileById(fileId);
      await this.assertCanAddBytes(storageId, Number(meta.size) || 0);
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
    const id = storage._id.toString();
    const usedBytes = await this.getUsedBytes(id);
    return {
      id,
      items: [],
      createdAt: storage.createdAt?.toISOString() || new Date().toISOString(),
      maxBytes: this.resolveMaxBytes(storage),
      usedBytes,
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
    return Promise.all(
      storages.map(async (storage) => {
        const id = storage._id.toString();
        const usedBytes = await this.getUsedBytes(id);
        return {
          id,
          tags: storage.tags || [],
          createdAt: storage.createdAt?.toISOString() || new Date().toISOString(),
          maxBytes: this.resolveMaxBytes(storage),
          usedBytes,
        };
      }),
    );
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
    items: StorageItem[],
    includeDeletedForDirectoryStats = false
  ): Promise<EnrichedStorageItemDto[]> {
    const enrichedItems = await Promise.all(
      items.map(async (item): Promise<EnrichedStorageItemDto> => {
        if (item.isDirectory) {
          const childrenCount = await this.itemTree.getChildrenCount(
            item._id.toString(),
            includeDeletedForDirectoryStats
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

  async getFullStorageStructureAdmin(storageId: string): Promise<EnrichedStorageItemDto[]> {
    const items = await this.itemTree.getAllItemsByStorageIdIncludingDeleted(storageId);
    return this.enrichItemsWithMetadata(items, true);
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
    return this.enrichItemsWithMetadata(items, true);
  }

  async restoreDeletedStructureAdmin(params: {
    itemId: string;
    newParentId?: string | null;
  }) {
    const item = await this.itemQuery.getItemById(params.itemId);
    if (!item) {
      throw new NotFoundException("Item not found.");
    }
    if (!item.deletedAt) {
      throw new BadRequestException("Item is not deleted.");
    }

    await this.itemTrash.restore(params.itemId, params.newParentId);
    return { success: true, itemId: params.itemId };
  }

  async purgeStorageItemsPermanently() {
    const now = new Date();
    const expiredItems = await this.itemQuery.getItemsPendingPermanentDelete();
    if (expiredItems.length === 0) {
      return { purgedRoots: 0, purgedItems: 0, purgedFiles: 0 };
    }

    const expiredIds = new Set(
      expiredItems
        .filter(
          (item) =>
            item.permanentDeleteAt != null && new Date(item.permanentDeleteAt) <= now
        )
        .map((item) => item._id.toString())
    );

    if (expiredIds.size === 0) {
      return { purgedRoots: 0, purgedItems: 0, purgedFiles: 0 };
    }

    const rootIds = Array.from(expiredIds).filter((id) => {
      const node = expiredItems.find((item) => item._id.toString() === id);
      if (!node?.parentId) {
        return true;
      }
      return !expiredIds.has(node.parentId.toString());
    });

    let purgedItems = 0;
    let purgedFiles = 0;

    for (const rootId of rootIds) {
      const removedItems = await this.itemTrash.hardDelete(rootId);
      purgedItems += removedItems.length;

      const fileIds = Array.from(
        new Set(
          removedItems
            .filter((item) => !item.isDirectory && item.fileId)
            .map((item) => item.fileId!.toString())
        )
      );

      if (fileIds.length > 0) {
        const orphanedFileIds: string[] = [];
        for (const fileId of fileIds) {
          const referenced = await this.itemQuery.hasFileReference(fileId);
          if (!referenced) {
            orphanedFileIds.push(fileId);
          }
        }
        if (orphanedFileIds.length > 0) {
          await this.fileService.deleteFilesCompletely(orphanedFileIds);
          purgedFiles += orphanedFileIds.length;
        }
      }
    }

    return { purgedRoots: rootIds.length, purgedItems, purgedFiles };
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
    mimeTypes?: string[];
    offset?: number;
  }) {
    const items = await this.itemQuery.searchItems(params);
    const enrichedItems = await this.enrichItemsWithMetadata(items);
    const allowedMimeTypes =
      params.mimeTypes ?? (params.mimeType ? [params.mimeType] : undefined);
    return enrichedItems.filter(
      item =>
        item.isDirectory ||
        !allowedMimeTypes?.length ||
        (item.fileMeta?.mimeType != null &&
          allowedMimeTypes.includes(item.fileMeta.mimeType)),
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

    const addBytes = await this.sumBytesForStorageItemSubtree(
      params.itemId,
      params.storageId
    );
    await this.assertCanAddBytes(params.storageId, addBytes);

    const copiedItem = await this.itemCopy.copyItem(
      params.itemId,
      params.targetParentId,
      params.userId.toString(),
      params.storageId
    );
    return StorageItemMapper.toBaseDto(copiedItem);
  }
}
