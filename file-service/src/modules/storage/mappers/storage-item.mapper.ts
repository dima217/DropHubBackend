import { StorageItem } from '../schemas/storage.item.schema';
import type { FileMeta } from '../../file/interfaces/file-service.interface';

export interface BaseStorageItemDto {
  id: string;
  userId: string;
  name: string;
  storageId: string;
  isDirectory: boolean;
  parentId: string | null;
  fileId?: string | null;
  creatorId?: number;
  tags?: string[];
  deletedAt?: Date | null;
}

export interface DirectoryStorageItemDto extends BaseStorageItemDto {
  isDirectory: true;
  childrenCount: number;
  filesCount: number;
  foldersCount: number;
}

export interface FileStorageItemDto extends BaseStorageItemDto {
  isDirectory: false;
  fileMeta?: {
    _id: string;
    originalName: string;
    storedName: string;
    size: number;
    mimeType: string;
    uploadTime: any;
    downloadCount: number;
    creatorId?: number;
  };
}

export type EnrichedStorageItemDto = DirectoryStorageItemDto | FileStorageItemDto;

export class StorageItemMapper {
  /**
   * Maps StorageItem to base DTO structure
   */
  static toBaseDto(item: StorageItem): BaseStorageItemDto {
    return {
      id: item._id.toString(),
      userId: item.userId,
      name: item.name,
      storageId: item.storageId,
      isDirectory: item.isDirectory,
      parentId: item.parentId?.toString() || null,
      fileId: item.fileId?.toString() || null,
      creatorId: item.creatorId,
      tags: item.tags || [],
      deletedAt: item.deletedAt,
    };
  }

  /**
   * Maps StorageItem with children count to Directory DTO
   */
  static toDirectoryDto(
    item: StorageItem,
    childrenCount: { total: number; files: number; folders: number },
  ): DirectoryStorageItemDto {
    const baseDto = this.toBaseDto(item);
    return {
      ...baseDto,
      isDirectory: true,
      childrenCount: childrenCount.total,
      filesCount: childrenCount.files,
      foldersCount: childrenCount.folders,
    };
  }

  /**
   * Maps FileMeta to file metadata DTO
   */
  static mapFileMeta(fileMeta: FileMeta): FileStorageItemDto['fileMeta'] {
    return {
      _id: fileMeta._id?.toString() || String(fileMeta._id),
      originalName: fileMeta.originalName,
      storedName: fileMeta.storedName,
      size: fileMeta.size,
      mimeType: fileMeta.mimeType,
      uploadTime: fileMeta.uploadTime,
      downloadCount: fileMeta.downloadCount,
      creatorId: fileMeta.creatorId,
    };
  }

  /**
   * Maps StorageItem with file metadata to File DTO
   */
  static toFileDto(item: StorageItem, fileMeta?: FileMeta): FileStorageItemDto {
    const baseDto = this.toBaseDto(item);
    return {
      ...baseDto,
      isDirectory: false,
      fileMeta: fileMeta ? this.mapFileMeta(fileMeta) : undefined,
    };
  }
}

