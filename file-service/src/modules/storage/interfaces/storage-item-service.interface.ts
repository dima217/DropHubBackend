import { StorageItem } from '../schemas/storage.item.schema';

export interface IStorageItemService {
  getItemsByParent(parentId: string | null, storageId?: string): Promise<StorageItem[]>;
  getItemById(itemId: string): Promise<StorageItem>;
  createItem(
    name: string,
    isDirectory: boolean,
    parentId: string | null,
    fileId: string | null,
    userId: string,
    storageId: string,
    creatorId?: number,
  ): Promise<StorageItem>;
  softDeleteItem(itemId: string): Promise<void>;
  restoreItem(itemId: string, newParentId?: string | null): Promise<void>;
  getTrashItems(storageId: string): Promise<StorageItem[]>;
  deleteItem(itemId: string): Promise<void>;
  getAllItemsByStorageId(storageId: string): Promise<StorageItem[]>;
  updateItemTags(itemId: string, tags: string[]): Promise<StorageItem>;
  searchItems(params: {
    storageIds: string[];
    query?: string;
    tags?: string[];
    creatorId?: number;
    limit?: number;
    offset?: number;
  }): Promise<StorageItem[]>;
  moveItem(itemId: string, newParentId: string | null): Promise<StorageItem>;
  renameItem(itemId: string, newName: string): Promise<StorageItem>;
  copyItem(
    itemId: string,
    targetParentId: string | null,
    userId: string,
    storageId: string,
  ): Promise<StorageItem>;
  getChildrenCount(itemId: string): Promise<{ total: number; files: number; folders: number }>;
}


