import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FavoriteStorageItem } from '../entities/favorite-storage.entity';
import { UniversalPermissionService } from '../../permission/services/permission.service';
import { ResourceType, AccessRole } from '../../permission/entities/permission.entity';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(FavoriteStorageItem)
    private readonly favoriteStorageItemRepository: Repository<FavoriteStorageItem>,
    private readonly permissionService: UniversalPermissionService,
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

  async getFavoriteStorageItems(userId: number) {
    const favorites = await this.favoriteStorageItemRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return favorites.map((f) => f.itemId);
  }

  async isFavorite(userId: number, itemId: string): Promise<boolean> {
    const favorite = await this.favoriteStorageItemRepository.findOne({
      where: { userId, itemId },
    });

    return !!favorite;
  }
}
