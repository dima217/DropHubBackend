import { StorageItem } from '../schemas/storage.item.schema';

export interface IStorageService {
  createStorage(userId: number): Promise<{
    id: string;
    items: any[];
    createdAt: string;
    maxBytes: number;
  }>;
  createItemInStorage(params: {
    storageId: string;
    name: string;
    isDirectory: boolean;
    parentId: string | null;
    fileId: string | null;
    userId: number;
  }): Promise<StorageItem>;
  getStorageById(storageId: string): Promise<{
    id: string;
    items: any[];
    createdAt: string;
    maxBytes: number;
  } | null>;
  getStoragesByIds(storageIds: string[]): Promise<
    Array<{
      id: string;
      items: any[];
      createdAt: string;
      maxBytes: number;
    }>
  >;
  getStoragesByUserId(userId: number): Promise<any[]>;
  getStorageItemByToken(token: string): Promise<StorageItem & { children?: StorageItem[] }>;
  getFullStorageStructure(storageId: string, userId: number): Promise<any[]>;
  getStorageStructure(params: {
    storageId: string;
    parentId: string | null;
    userId: number;
  }): Promise<any[]>;
  deleteStorageItem(params: {
    storageId: string;
    itemId: string;
    userId: number;
    newParentId?: string | null;
  }): Promise<{ success: boolean; itemId: string }>;
  restoreStorageItem(params: {
    storageId: string;
    itemId: string;
    userId: number;
    newParentId?: string | null;
  }): Promise<{ success: boolean; itemId: string }>;
  permanentDeleteStorageItem(params: {
    storageId: string;
    itemId: string;
    userId: number;
    newParentId?: string | null;
  }): Promise<{ success: boolean; itemId: string }>;
  getTrashItems(storageId: string): Promise<any[]>;
  updateStorageItemTags(
    storageId: string,
    itemId: string,
    tags: string[],
  ): Promise<any>;
  moveStorageItem(params: {
    storageId: string;
    itemId: string;
    newParentId: string | null;
    userId: number;
  }): Promise<any>;
  searchStorageItems(params: {
    storageIds: string[];
    query?: string;
    tags?: string[];
    creatorId?: number;
    limit?: number;
    offset?: number;
  }): Promise<any[]>;
  renameStorageItem(params: {
    storageId: string;
    itemId: string;
    newName: string;
    userId: number;
  }): Promise<any>;
  copyStorageItem(params: {
    storageId: string;
    itemId: string;
    targetParentId: string | null;
    userId: number;
  }): Promise<any>;
}


