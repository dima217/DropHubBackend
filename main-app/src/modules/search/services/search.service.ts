import { Injectable } from '@nestjs/common';
import { UniversalPermissionService } from '../../permission/services/permission.service';
import { ResourceType } from '../../permission/entities/permission.entity';
import { SearchDto, SearchResourceType } from '../dto/search.dto';
import { FileClientService } from '../../file-client/services/file-client.service';
import { StorageClientService } from '../../file-client/services/storage-client.service';

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
      }>;
    } = {
      files: [],
      storageItems: [],
    };

    // Определяем, в каких ресурсах искать
    const searchInRooms =
      dto.resourceType === SearchResourceType.ALL || dto.resourceType === SearchResourceType.ROOM;
    const searchInStorage =
      dto.resourceType === SearchResourceType.ALL ||
      dto.resourceType === SearchResourceType.STORAGE;

    // Получаем разрешения пользователя
    if (searchInRooms) {
      const roomPermissions = await this.permissionService.getPermissionsByUserIdAndType(
        userId,
        ResourceType.ROOM,
      );
      const roomIds = roomPermissions.map((p) => p.resourceId);

      if (roomIds.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
        const files = await this.fileClient.searchFiles({
          roomIds,
          query: dto.query,
          mimeType: dto.mimeType,
          creatorId: dto.creatorId,
          limit: dto.limit,
          offset: dto.offset,
        });

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        results.files = files.map((file) => ({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          id: file._id?.toString() || '',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          originalName: file.originalName,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          mimeType: file.mimeType,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          size: file.size,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          creatorId: file.creatorId,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
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
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          tags: item.tags ?? [],
          resourceId: item.storageId,
          resourceType: 'storage' as const,
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
