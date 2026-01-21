import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { StorageService } from './storage.service';

@Controller()
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

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

  @MessagePattern('storage.getItemByToken')
  async getItemByToken(@Payload() data: { token: string }) {
    return this.storageService.getStorageItemByToken(data.token);
  }

  @MessagePattern('storage.getByUserId')
  async getStoragesByUserId(@Payload() data: { userId: number }) {
    return this.storageService.getStoragesByUserId(data.userId);
  }
}
