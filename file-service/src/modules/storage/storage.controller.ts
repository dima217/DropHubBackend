import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import type { IStorageService } from './interfaces';
import { STORAGE_SERVICE_TOKEN } from './interfaces';

@Controller()
export class StorageController {
  constructor(
    @Inject(STORAGE_SERVICE_TOKEN) private readonly storageService: IStorageService,
  ) {}

  @MessagePattern('storage.create')
  async createStorage(@Payload() data: { userId: number }) {
    return this.storageService.createStorage(data.userId);
  }

  @MessagePattern('storage.createItem')
  async createItem(@Payload() data: any) {
    return this.storageService.createItemInStorage(data);
  }

  @MessagePattern('storage.getStructure')
  async getStructure(
    @Payload() data: { storageId: string; parentId: string | null; userId: number },
  ) {
    return this.storageService.getStorageStructure(data);
  }

  @MessagePattern('storage.getFullStructure')
  async getFullStructure(@Payload() data: { storageId: string; userId: number }) {
    return this.storageService.getFullStorageStructure(data.storageId, data.userId);
  }

  @MessagePattern('storage.deleteItem')
  async deleteItem(@Payload() data: { storageId: string; itemId: string; userId: number }) {
    return this.storageService.deleteStorageItem(data);
  }

  @MessagePattern('storage.restoreItem')
  async restoreItem(@Payload() data: { storageId: string; itemId: string; userId: number }) {
    return this.storageService.restoreStorageItem(data);
  }

  @MessagePattern('storage.permanentDeleteItem')
  async permanentDeleteItem(@Payload() data: { storageId: string; itemId: string; userId: number }) {
    return this.storageService.permanentDeleteStorageItem(data);
  }

  @MessagePattern('storage.getTrash')
  async getTrash(@Payload() data: { storageId: string; userId: number }) {
    return this.storageService.getTrashItems(data.storageId);
  }

  @MessagePattern('storage.getItemByToken')
  async getItemByToken(@Payload() data: { token: string }) {
    return this.storageService.getStorageItemByToken(data.token);
  }

  @MessagePattern('storage.getByUserId')
  async getStoragesByUserId(@Payload() data: { userId: number }) {
    return this.storageService.getStoragesByUserId(data.userId);
  }

  @MessagePattern('storage.getById')
  async getStorageById(@Payload() data: { storageId: string }) {
    return this.storageService.getStorageById(data.storageId);
  }

  @MessagePattern('storage.getByIds')
  async getStoragesByIds(@Payload() data: { storageIds: string[] }) {
    return this.storageService.getStoragesByIds(data.storageIds);
  }

  @MessagePattern('storage.updateItemTags')
  async updateItemTags(
    @Payload() data: { storageId: string; itemId: string; tags: string[] },
  ) {
    return this.storageService.updateStorageItemTags(data.storageId, data.itemId, data.tags);
  }

  @MessagePattern('storage.moveItem')
  async moveItem(
    @Payload() data: { storageId: string; itemId: string; newParentId: string | null; userId: number },
  ) {
    return this.storageService.moveStorageItem(data);
  }

  @MessagePattern('storage.searchItems')
  async searchItems(
    @Payload()
    data: {
      storageIds: string[];
      query?: string;
      tags?: string[];
      creatorId?: number;
      limit?: number;
      offset?: number;
    },
  ) {
    return this.storageService.searchStorageItems(data);
  }
}
