import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FavoriteResourceType, FavoriteStorageItem } from '../entities/favorite-storage.entity';
import { UniversalPermissionService } from '../../permission/services/permission.service';
import { ResourceType, AccessRole } from '../../permission/entities/permission.entity';
import { StorageClientService } from '@application/file-client';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(FavoriteStorageItem)
    private readonly favoriteStorageItemRepository: Repository<FavoriteStorageItem>,
    private readonly permissionService: UniversalPermissionService,
    private readonly storageClient: StorageClientService,
  ) {}

  async addFavoriteStorageItem(userId: number, storageId: string, itemId: string) {
    await this.permissionService.verifyUserAccess(userId, storageId, ResourceType.STORAGE, [
      AccessRole.ADMIN,
      AccessRole.READ,
      AccessRole.WRITE,
    ]);

    const existing = await this.favoriteStorageItemRepository.findOne({
      where: { userId, itemId },
    });

    if (existing) {
      throw new ConflictException('Storage item is already in favorites');
    }

    const favorite = this.favoriteStorageItemRepository.create({
      userId,
      storageId,
      itemId,
      resourceType: FavoriteResourceType.STORAGE,
    });

    return this.favoriteStorageItemRepository.save(favorite);
  }

  async addSharedItemToFavorites(userId: number, itemId: string, storageId: string) {
    const existing = await this.favoriteStorageItemRepository.findOne({
      where: { userId, itemId },
    });

    if (existing) {
      throw new ConflictException('Shared item is already in favorites');
    }

    const favorite = this.favoriteStorageItemRepository.create({
      userId,
      itemId,
      storageId,
      resourceType: FavoriteResourceType.SHARED,
    });

    return this.favoriteStorageItemRepository.save(favorite);
  }

  async removeFavoriteStorageItem(userId: number, itemId: string) {
    const favorite = await this.favoriteStorageItemRepository.findOne({
      where: { userId, itemId },
    });

    if (!favorite) {
      throw new NotFoundException('Storage item is not in favorites');
    }

    await this.favoriteStorageItemRepository.remove(favorite);
    return { success: true };
  }

  async addFavoriteStorageItemsBatch(userId: number, storageId: string, itemIds: string[]) {
    await this.permissionService.verifyUserAccess(userId, storageId, ResourceType.STORAGE, [
      AccessRole.ADMIN,
      AccessRole.READ,
      AccessRole.WRITE,
    ]);

    const unique = [...new Set(itemIds)];
    const results: Array<{
      itemId: string;
      success: boolean;
      duplicate?: boolean;
      error?: string;
    }> = [];

    for (const itemId of unique) {
      try {
        const existing = await this.favoriteStorageItemRepository.findOne({
          where: { userId, itemId },
        });
        if (existing) {
          results.push({ itemId, success: true, duplicate: true });
          continue;
        }
        const favorite = this.favoriteStorageItemRepository.create({
          userId,
          storageId,
          itemId,
          resourceType: FavoriteResourceType.STORAGE,
        });
        await this.favoriteStorageItemRepository.save(favorite);
        results.push({ itemId, success: true });
      } catch (err) {
        results.push({
          itemId,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return {
      total: unique.length,
      succeeded: results.filter((r) => r.success && !r.duplicate).length,
      skippedDuplicate: results.filter((r) => r.duplicate).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  }

  async addSharedItemsToFavoritesBatch(userId: number, storageId: string, itemIds: string[]) {
    const unique = [...new Set(itemIds)];
    const results: Array<{
      itemId: string;
      success: boolean;
      duplicate?: boolean;
      error?: string;
    }> = [];

    for (const itemId of unique) {
      try {
        const existing = await this.favoriteStorageItemRepository.findOne({
          where: { userId, itemId },
        });
        if (existing) {
          results.push({ itemId, success: true, duplicate: true });
          continue;
        }
        const favorite = this.favoriteStorageItemRepository.create({
          userId,
          itemId,
          storageId,
          resourceType: FavoriteResourceType.SHARED,
        });
        await this.favoriteStorageItemRepository.save(favorite);
        results.push({ itemId, success: true });
      } catch (err) {
        results.push({
          itemId,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return {
      total: unique.length,
      succeeded: results.filter((r) => r.success && !r.duplicate).length,
      skippedDuplicate: results.filter((r) => r.duplicate).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  }

  async removeFavoriteStorageItemsBatch(userId: number, itemIds: string[]) {
    const unique = [...new Set(itemIds)];
    const results: Array<{ itemId: string; success: boolean; error?: string }> = [];

    for (const itemId of unique) {
      try {
        const favorite = await this.favoriteStorageItemRepository.findOne({
          where: { userId, itemId },
        });
        if (!favorite) {
          results.push({ itemId, success: false, error: 'Not in favorites' });
          continue;
        }
        await this.favoriteStorageItemRepository.remove(favorite);
        results.push({ itemId, success: true });
      } catch (err) {
        results.push({
          itemId,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return {
      total: unique.length,
      succeeded: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  }

  async getFavoriteStorageItems(userId: number) {
    const favorites = await this.favoriteStorageItemRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    const items = await this.storageClient
      .getItemsByIds(favorites.map((f) => f.itemId))
      .then((items) => {
        return items.map((item) => {
          return {
            ...item,
            resourceType: favorites.find((f) => f.itemId === item.id)?.resourceType,
          };
        });
      });
    return items;
  }

  async isFavorite(userId: number, itemId: string): Promise<boolean> {
    const favorite = await this.favoriteStorageItemRepository.findOne({
      where: { userId, itemId },
    });

    return !!favorite;
  }
}
