import { Controller, Post, Delete, Get, Body, UseGuards, Req, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { FavoritesService } from '../services/favorites.service';
import { AddFavoriteStorageItemDto } from '../dto/add-favorite-storage.dto';
import { RemoveFavoriteStorageItemDto } from '../dto/remove-favorite-storage.dto';
import {
  BatchAddFavoriteStorageItemsDto,
  BatchRemoveFavoriteStorageItemsDto,
} from '../dto/batch-favorite-storage.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-guard';
import { PermissionGuard } from 'src/auth/guards/permission.guard';
import { RequirePermission } from 'src/auth/common/decorators/permission.decorator';
import { ResourceType, AccessRole } from 'src/modules/permission/entities/permission.entity';
import type { RequestWithUser } from 'src/types/express';

@ApiTags('Favorites')
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
  @ApiOperation({
    summary: 'Add storage item to favorites',
    description:
      'Adds a storage item to the user favorites list. Requires READ, WRITE, or ADMIN permission on the storage.',
  })
  @ApiBody({ type: AddFavoriteStorageItemDto })
  @ApiResponse({
    status: 200,
    description: 'Item added to favorites successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Item added to favorites' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Storage or item not found' })
  async addFavoriteStorageItem(
    @Req() req: RequestWithUser,
    @Body() body: AddFavoriteStorageItemDto,
  ) {
    return this.favoritesService.addFavoriteStorageItem(req.user.id, body.storageId, body.itemId);
  }

  @Post('storage-items/batch')
  @UseGuards(PermissionGuard)
  @RequirePermission(
    ResourceType.STORAGE,
    [AccessRole.ADMIN, AccessRole.READ, AccessRole.WRITE],
    'body',
    'storageId',
  )
  @ApiOperation({
    summary: 'Add multiple storage items to favorites',
    description:
      'Adds many items in one request. Items already favorited are reported as duplicates and do not error.',
  })
  @ApiBody({ type: BatchAddFavoriteStorageItemsDto })
  @ApiResponse({ status: 200, description: 'Per-item results' })
  async addFavoriteStorageItemsBatch(
    @Req() req: RequestWithUser,
    @Body() body: BatchAddFavoriteStorageItemsDto,
  ) {
    return this.favoritesService.addFavoriteStorageItemsBatch(
      req.user.id,
      body.storageId,
      body.itemIds,
    );
  }

  @ApiOperation({
    summary: 'Add shared item to favorites',
    description: 'Adds a shared item to the user favorites list.',
  })
  @ApiBody({ type: AddFavoriteStorageItemDto })
  @ApiResponse({
    status: 200,
    description: 'Item added to favorites successfully',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Storage or item not found' })
  @Post('shared-item')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  async addSharedItemToFavorites(
    @Req() req: RequestWithUser,
    @Body() body: AddFavoriteStorageItemDto,
  ) {
    return this.favoritesService.addSharedItemToFavorites(req.user.id, body.itemId, body.storageId);
  }

  @Post('shared-items/batch')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @ApiOperation({
    summary: 'Add multiple shared items to favorites',
    description: 'Same as single shared favorite, but for many item IDs.',
  })
  @ApiBody({ type: BatchAddFavoriteStorageItemsDto })
  @ApiResponse({ status: 200, description: 'Per-item results' })
  async addSharedItemsToFavoritesBatch(
    @Req() req: RequestWithUser,
    @Body() body: BatchAddFavoriteStorageItemsDto,
  ) {
    return this.favoritesService.addSharedItemsToFavoritesBatch(
      req.user.id,
      body.storageId,
      body.itemIds,
    );
  }

  @Delete('storage-item')
  @ApiOperation({
    summary: 'Remove storage item from favorites',
    description: 'Removes a storage item from the user favorites list.',
  })
  @ApiBody({ type: RemoveFavoriteStorageItemDto })
  @ApiResponse({
    status: 200,
    description: 'Item removed from favorites successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Item removed from favorites' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Favorite item not found' })
  async removeFavoriteStorageItem(
    @Req() req: RequestWithUser,
    @Body() body: RemoveFavoriteStorageItemDto,
  ) {
    return this.favoritesService.removeFavoriteStorageItem(req.user.id, body.itemId);
  }

  @Post('items/batch-remove')
  @ApiOperation({
    summary: 'Remove multiple items from favorites by item ID',
    description:
      'Works for both personal storage favorites and shared favorites (same as single remove).',
  })
  @ApiBody({ type: BatchRemoveFavoriteStorageItemsDto })
  @ApiResponse({ status: 200, description: 'Per-item results' })
  async removeFavoriteStorageItemsBatch(
    @Req() req: RequestWithUser,
    @Body() body: BatchRemoveFavoriteStorageItemsDto,
  ) {
    return this.favoritesService.removeFavoriteStorageItemsBatch(req.user.id, body.itemIds);
  }

  @Delete('shared-item')
  @ApiOperation({
    summary: 'Remove shared item from favorites',
    description: 'Removes a shared item from the user favorites list.',
  })
  @ApiBody({ type: RemoveFavoriteStorageItemDto })
  @ApiResponse({
    status: 200,
    description: 'Item removed from favorites successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Item removed from favorites' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Favorite item not found' })
  @UseGuards(JwtAuthGuard, PermissionGuard)
  async removeSharedItemFromFavorites(
    @Req() req: RequestWithUser,
    @Body() body: RemoveFavoriteStorageItemDto,
  ) {
    return this.favoritesService.removeFavoriteStorageItem(req.user.id, body.itemId);
  }

  @Post()
  @ApiOperation({
    summary: 'Get favorite storage items',
    description: 'Retrieves all storage item IDs that are in the user favorites list.',
  })
  @ApiResponse({
    status: 200,
    description: 'Favorite items retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        items: {
          type: 'array',
          items: { type: 'string' },
          example: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
        },
      },
    },
  })
  async getFavoriteStorageItems(@Req() req: RequestWithUser) {
    const items = await this.favoritesService.getFavoriteStorageItems(req.user.id);
    return { success: true, items };
  }

  @Get('storage-item/:itemId')
  @ApiOperation({
    summary: 'Check if item is favorite',
    description: 'Checks if a specific storage item is in the user favorites list.',
  })
  @ApiParam({ name: 'itemId', description: 'Storage item ID', example: '507f1f77bcf86cd799439011' })
  @ApiResponse({
    status: 200,
    description: 'Favorite status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        isFavorite: { type: 'boolean', example: true },
      },
    },
  })
  async isFavorite(@Req() req: RequestWithUser, @Param('itemId') itemId: string) {
    const isFavorite = await this.favoritesService.isFavorite(req.user.id, itemId);
    return { success: true, isFavorite };
  }
}
