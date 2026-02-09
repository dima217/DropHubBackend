import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  CreateStorageItemPayload,
  DeleteStorageItemResult,
  GetStorageStructurePayload,
  StorageItemDto,
  StorageItemWithChildrenDto,
  UserStorageDto,
} from '../types/storage';

export interface DeleteStorageItemPayload {
  storageId: string;
  itemId: string;
  userId: number;
}

export interface RestoreStorageItemPayload extends DeleteStorageItemPayload {
  newParentId?: string | null;
}

export interface MoveStorageItemPayload {
  storageId: string;
  itemId: string;
  newParentId: string | null;
  userId: number;
}

export interface RenameStorageItemPayload {
  storageId: string;
  itemId: string;
  newName: string;
  userId: number;
}

export interface CopyStorageItemPayload {
  storageId: string;
  itemId: string;
  targetParentId: string | null;
  userId: number;
}

export interface GetSharedItemStructurePayload {
  storageId: string;
  parentId: string | null;
  resourceId: string;
  userId: number;
}

@Injectable()
export class StorageClientService {
  constructor(@Inject('FILE_SERVICE') private readonly fileClient: ClientProxy) {}

  private send<TResponse, TPayload = unknown>(
    pattern: string,
    payload: TPayload,
  ): Promise<TResponse> {
    return firstValueFrom(this.fileClient.send<TResponse, TPayload>(pattern, payload));
  }

  async createStorage(userId: number): Promise<UserStorageDto> {
    return this.send<UserStorageDto, { userId: number }>('storage.create', { userId });
  }

  async createStorageItem(data: CreateStorageItemPayload): Promise<StorageItemDto> {
    return this.send<StorageItemDto, CreateStorageItemPayload>('storage.createItem', data);
  }

  async getItemsByIds(itemIds: string[]): Promise<StorageItemDto[]> {
    return this.send<StorageItemDto[], { itemIds: string[] }>('storage.getSharedItems', {
      itemIds,
    });
  }

  async getStorageStructure(data: GetStorageStructurePayload): Promise<StorageItemDto[]> {
    return this.send<StorageItemDto[], GetStorageStructurePayload>('storage.getStructure', data);
  }

  async getSharedItemStructure(data: GetSharedItemStructurePayload): Promise<StorageItemDto[]> {
    return this.send<StorageItemDto[], GetSharedItemStructurePayload>(
      'storage.getSharedStructure',
      data,
    );
  }

  async getFullStorageStructure(storageId: string, userId: number): Promise<StorageItemDto[]> {
    return this.send<StorageItemDto[], { storageId: string; userId: number }>(
      'storage.getFullStructure',
      { storageId, userId },
    );
  }

  async deleteStorageItem(data: DeleteStorageItemPayload): Promise<DeleteStorageItemResult> {
    return this.send<DeleteStorageItemResult, DeleteStorageItemPayload>('storage.deleteItem', data);
  }

  async restoreStorageItem(data: RestoreStorageItemPayload): Promise<DeleteStorageItemResult> {
    return this.send<DeleteStorageItemResult, RestoreStorageItemPayload>(
      'storage.restoreItem',
      data,
    );
  }

  async permanentDeleteStorageItem(
    data: DeleteStorageItemPayload,
  ): Promise<DeleteStorageItemResult> {
    return this.send<DeleteStorageItemResult, DeleteStorageItemPayload>(
      'storage.permanentDeleteItem',
      data,
    );
  }

  async getTrashItems(storageId: string, userId: number): Promise<StorageItemDto[]> {
    return this.send<StorageItemDto[], { storageId: string; userId: number }>('storage.getTrash', {
      storageId,
      userId,
    });
  }

  async getStorageItemByToken(token: string): Promise<StorageItemWithChildrenDto> {
    return this.send<StorageItemWithChildrenDto, { token: string }>('storage.getItemByToken', {
      token,
    });
  }

  async getStoragesByUserId(userId: number): Promise<UserStorageDto[]> {
    return this.send<UserStorageDto[], { userId: number }>('storage.getByUserId', { userId });
  }

  async getStorageById(storageId: string): Promise<UserStorageDto | null> {
    return this.send<UserStorageDto | null, { storageId: string }>('storage.getById', {
      storageId,
    });
  }

  async getStoragesByIds(storageIds: string[]): Promise<UserStorageDto[]> {
    return this.send<UserStorageDto[], { storageIds: string[] }>('storage.getByIds', {
      storageIds,
    });
  }

  async updateStorageItemTags(
    storageId: string,
    itemId: string,
    tags: string[],
  ): Promise<StorageItemDto> {
    return this.send<StorageItemDto, { storageId: string; itemId: string; tags: string[] }>(
      'storage.updateItemTags',
      {
        storageId,
        itemId,
        tags,
      },
    );
  }

  async removeStorageTags(storageId: string, tags: string[]): Promise<void> {
    return this.send<void, { storageId: string; tags: string[] }>('storage.removeStorageTags', {
      storageId,
      tags,
    });
  }

  async moveStorageItem(data: MoveStorageItemPayload): Promise<StorageItemDto> {
    return this.send<StorageItemDto, MoveStorageItemPayload>('storage.moveItem', data);
  }

  async searchStorageItems(payload: {
    storageIds: string[];
    query?: string;
    tags?: string[];
    creatorId?: number;
    limit?: number;
    offset?: number;
    mimeType?: string;
  }): Promise<Array<StorageItemDto>> {
    return this.send<Array<StorageItemDto>, typeof payload>('storage.searchItems', payload);
  }

  async renameStorageItem(data: RenameStorageItemPayload): Promise<StorageItemDto> {
    return this.send<StorageItemDto, RenameStorageItemPayload>('storage.renameItem', data);
  }

  async copyStorageItem(data: CopyStorageItemPayload): Promise<StorageItemDto> {
    return this.send<StorageItemDto, CopyStorageItemPayload>('storage.copyItem', data);
  }
}
