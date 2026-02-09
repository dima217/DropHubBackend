import { Injectable } from '@nestjs/common';
import { UniversalPermissionService } from '../../permission/services/permission.service';
import { ResourceType } from '../../permission/entities/permission.entity';
import { SearchDto, SearchResourceType } from '../dto/search.dto';
import { FileClientService } from '../../file-client/services/file-client.service';
import { StorageClientService } from '../../file-client/services/storage-client.service';
import { FileMeta } from '../../file-client/types/file';

@Injectable()
export class SearchService {
  constructor(
    private readonly permissionService: UniversalPermissionService,
    private readonly fileClient: FileClientService,
    private readonly storageClient: StorageClientService,
  ) {}

  async search(userId: number, dto: SearchDto) {
    const results: {
      files: Array<{
        id: string;
        originalName: string;
        mimeType: string;
        size: number;
        creatorId?: number;
        resourceId: string;
        resourceType: 'room';
      }>;
      storageItems: Array<{
        id: string;
        name: string;
        isDirectory: boolean;
        creatorId?: number;
        tags?: string[];
        resourceId: string;
        resourceType: 'storage';
        fileMeta?: FileMeta;
      }>;
    } = {
      files: [],
      storageItems: [],
    };

    const searchInRooms =
      dto.resourceType === SearchResourceType.ALL || dto.resourceType === SearchResourceType.ROOM;
    const searchInStorage =
      dto.resourceType === SearchResourceType.ALL ||
      dto.resourceType === SearchResourceType.STORAGE;

    if (searchInRooms) {
      const roomPermissions = await this.permissionService.getPermissionsByUserIdAndType(
        userId,
        ResourceType.ROOM,
      );
      const roomIds = roomPermissions.map((p) => p.resourceId);

      if (roomIds.length > 0) {
        const files = await this.fileClient.searchFiles({
          roomIds,
          query: dto.query,
          mimeType: dto.mimeType,
          creatorId: dto.creatorId,
          limit: dto.limit,
          offset: dto.offset,
        });

        results.files = files.map((file) => ({
          id: String(file._id),
          originalName: file.originalName,
          mimeType: file.mimeType,
          size: file.size,
          creatorId: file.creatorId,
          resourceId: file.roomId,
          resourceType: 'room' as const,
        }));
      }
    }

    if (searchInStorage) {
      const storagePermissions = await this.permissionService.getPermissionsByUserIdAndType(
        userId,
        ResourceType.STORAGE,
      );
      const storageIds = storagePermissions.map((p) => p.resourceId);

      if (storageIds.length > 0) {
        const items = await this.storageClient.searchStorageItems({
          storageIds,
          query: dto.query,
          tags: dto.tags,
          creatorId: dto.creatorId,
          limit: dto.limit,
          offset: dto.offset,
        });

        results.storageItems = items.map((item) => ({
          id: item.id,
          name: item.name,
          isDirectory: item.isDirectory,
          creatorId: item.creatorId,
          tags: item.tags ?? [],
          resourceId: item.storageId,
          resourceType: 'storage' as const,
          childrenCount: item.childrenCount,
          filesCount: item.filesCount,
          foldersCount: item.foldersCount,
          fileMeta: item.fileMeta,
        })) as typeof results.storageItems;
      }
    }

    return {
      success: true,
      total: results.files.length + results.storageItems.length,
      files: results.files,
      storageItems: results.storageItems,
    };
  }
}
