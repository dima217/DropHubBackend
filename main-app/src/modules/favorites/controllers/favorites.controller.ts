import { Controller, Post, Delete, Get, Body, UseGuards, Req, Param } from '@nestjs/common';
import { FavoritesService } from '../services/favorites.service';
import { AddFavoriteStorageItemDto } from '../dto/add-favorite-storage.dto';
import { RemoveFavoriteStorageItemDto } from '../dto/remove-favorite-storage.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-guard';
import { PermissionGuard } from 'src/auth/guards/permission.guard';
import { RequirePermission } from 'src/auth/common/decorators/permission.decorator';
import { ResourceType, AccessRole } from 'src/modules/permission/entities/permission.entity';
import type { RequestWithUser } from 'src/types/express';

@Controller('favorites')
@UseGuards(JwtAuthGuard)
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Post('storage-item')
  @UseGuards(PermissionGuard)
  @RequirePermission(
    ResourceType.STORAGE,
    [AccessRole.ADMIN, AccessRole.READ, AccessRole.WRITE],
    'body',
    'storageId',
  )
  async addFavoriteStorageItem(
    @Req() req: RequestWithUser,
    @Body() body: AddFavoriteStorageItemDto,
  ) {
    return this.favoritesService.addFavoriteStorageItem(req.user.id, body.storageId, body.itemId);
  }

  @Delete('storage-item')
  async removeFavoriteStorageItem(
    @Req() req: RequestWithUser,
    @Body() body: RemoveFavoriteStorageItemDto,
  ) {
    return this.favoritesService.removeFavoriteStorageItem(req.user.id, body.itemId);
  }

  @Get('storage-item')
  async getFavoriteStorageItems(@Req() req: RequestWithUser) {
    const itemIds = await this.favoritesService.getFavoriteStorageItems(req.user.id);
    return { success: true, itemIds };
  }

  @Get('storage-item/:itemId')
  async isFavorite(@Req() req: RequestWithUser, @Param('itemId') itemId: string) {
    const isFavorite = await this.favoritesService.isFavorite(req.user.id, itemId);
    return { success: true, isFavorite };
  }
}
