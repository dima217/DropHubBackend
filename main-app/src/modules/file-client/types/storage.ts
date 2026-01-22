export interface StorageItemDto {
  id: string;
  userId: string;
  name: string;
  storageId: string;
  isDirectory: boolean;
  parentId: string | null;
  fileId?: string | null;
  creatorId?: number;
  tags?: string[];
}

export interface StorageItemWithChildrenDto extends StorageItemDto {
  children?: StorageItemDto[];
}

export interface UserStorageDto {
  id: string;
  items: StorageItemDto[];
  createdAt: string;
  maxBytes: number;
  userRole?: string;
}
export interface DeleteStorageItemResult {
  success: boolean;
  itemId: string;
}

export interface CreateStorageItemPayload {
  storageId: string;
  userId: number;
  name: string;
  isDirectory: boolean;
  parentId: string | null;
  fileId: string | null;
}

export interface GetStorageStructurePayload {
  storageId: string;
  parentId: string | null;
  userId: number;
}
