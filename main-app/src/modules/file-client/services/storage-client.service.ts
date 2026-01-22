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

  async getStorageStructure(data: GetStorageStructurePayload): Promise<StorageItemDto[]> {
    return this.send<StorageItemDto[], GetStorageStructurePayload>('storage.getStructure', data);
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
}
