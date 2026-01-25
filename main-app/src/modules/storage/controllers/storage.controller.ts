import {
  Controller,
  Post,
  Req,
  UseGuards,
  Body,
  BadRequestException,
  Get,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { StorageClientService } from '../../file-client/services/storage-client.service';
import { StorageService } from '../services/storage.service';
import type { RequestWithUser } from 'src/types/express';
import { GetStorageDto } from '../dto/get-storage.dto';
import { GetStructureDto } from '../dto/get-structure.dto';
import { DeleteItemDto } from '../dto/delete-item.dto';
import { RestoreItemDto } from '../dto/restore-item.dto';
import { MoveItemDto } from '../dto/move-item.dto';
import { CreateStorageItemDto } from '../dto/create-storage-item.dto';
import { UpdateStorageItemTagsDto } from '../dto/update-storage-item-tags.dto';
import { RenameItemDto } from '../dto/rename-item.dto';
import { CopyItemDto } from '../dto/copy-item.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-guard';
import { PermissionGuard } from 'src/auth/guards/permission.guard';
import { RequirePermission } from 'src/auth/common/decorators/permission.decorator';
import { ResourceType, AccessRole } from 'src/modules/permission/entities/permission.entity';

@ApiTags('Storage')
@Controller('storage')
@UseGuards(JwtAuthGuard)
export class UserStorageController {
  constructor(
    private readonly storageClient: StorageClientService,
    private readonly storageService: StorageService,
  ) {}

  @Post('/')
  @ApiOperation({ summary: 'Get all storages for the current user' })
  @ApiResponse({ status: 200, description: 'List of user storages' })
  async getUserStorages(@Req() req: RequestWithUser) {
    return this.storageService.getStoragesByUserId(req.user.id);
  }

  @Post('create')
  @ApiOperation({ summary: 'Create a new storage for the current user' })
  @ApiResponse({ status: 201, description: 'Storage created successfully' })
  async createStorage(@Req() req: RequestWithUser) {
    return this.storageService.createStorage(req.user.id);
  }

  @Post('create-item')
  @UseGuards(PermissionGuard)
  @RequirePermission(
    ResourceType.STORAGE,
    [AccessRole.ADMIN, AccessRole.WRITE],
    'body',
    'storageId',
  )
  @ApiOperation({ summary: 'Create a new storage item (file or directory)' })
  @ApiBody({ type: CreateStorageItemDto })
  @ApiResponse({ status: 201, description: 'Storage item created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async createStorageItem(@Req() req: RequestWithUser, @Body() body: CreateStorageItemDto) {
    return this.storageService.createStorageItem(
      req.user.id,
      body.storageId,
      body.name,
      body.isDirectory,
      body.parentId || null,
      body.fileId || null,
    );
  }

  @Get(':storageId/participants')
  @UseGuards(PermissionGuard)
  @RequirePermission(
    ResourceType.STORAGE,
    [AccessRole.ADMIN, AccessRole.READ, AccessRole.WRITE],
    'params',
    'storageId',
  )
  @ApiOperation({ summary: 'Get storage participants' })
  @ApiResponse({ status: 200, description: 'List of storage participants' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async getStorageParticipants(@Req() req: RequestWithUser, @Param('storageId') storageId: string) {
    return this.storageService.getStorageParticipants(req.user.id, storageId);
  }

  @UseGuards(PermissionGuard)
  @RequirePermission(
    ResourceType.STORAGE,
    [AccessRole.ADMIN, AccessRole.READ, AccessRole.WRITE],
    'body',
    'storageId',
  )
  @Post('full-tree')
  @ApiOperation({ summary: 'Get full storage structure (complete tree)' })
  @ApiBody({ type: GetStorageDto })
  @ApiResponse({ status: 200, description: 'Full storage structure' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async getFullStorageStructure(@Body() body: GetStorageDto, @Req() req: RequestWithUser) {
    if (!body.storageId) {
      throw new BadRequestException('Storage ID is required.');
    }
    return this.storageClient.getFullStorageStructure(body.storageId, req.user.id);
  }

  @UseGuards(PermissionGuard)
  @RequirePermission(
    ResourceType.STORAGE,
    [AccessRole.ADMIN, AccessRole.READ, AccessRole.WRITE],
    'body',
    'storageId',
  )
  @Post('structure')
  @ApiOperation({ summary: 'Get storage structure (items by parent)' })
  @ApiBody({ type: GetStructureDto })
  @ApiResponse({ status: 200, description: 'Storage structure' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async getStorageStructure(@Body() body: GetStructureDto, @Req() req: RequestWithUser) {
    if (!body.storageId) {
      throw new BadRequestException('Storage ID is required.');
    }

    const params = {
      storageId: body.storageId,
      parentId: body.parentId !== undefined ? body.parentId : null,
      userId: req.user.id,
    };

    return this.storageClient.getStorageStructure(params);
  }

  @UseGuards(PermissionGuard)
  @RequirePermission(
    ResourceType.STORAGE,
    [AccessRole.ADMIN, AccessRole.WRITE],
    'body',
    'storageId',
  )
  @Post('delete-item')
  @ApiOperation({ summary: 'Soft delete a storage item (move to trash)' })
  @ApiBody({ type: DeleteItemDto })
  @ApiResponse({ status: 200, description: 'Item moved to trash successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async deleteStorageItem(@Body() body: DeleteItemDto, @Req() req: RequestWithUser) {
    if (!body.storageId || !body.itemId) {
      throw new BadRequestException('Both Storage ID and Item ID are required.');
    }

    const params = {
      storageId: body.storageId,
      itemId: body.itemId,
      userId: req.user.id,
    };

    return await this.storageClient.deleteStorageItem(params);
  }

  @UseGuards(PermissionGuard)
  @RequirePermission(
    ResourceType.STORAGE,
    [AccessRole.ADMIN, AccessRole.WRITE],
    'body',
    'storageId',
  )
  @Post('restore-item')
  @ApiOperation({
    summary: 'Restore a storage item from trash',
    description:
      'Restores an item from trash. If original parent is deleted, newParentId must be provided.',
  })
  @ApiBody({ type: RestoreItemDto })
  @ApiResponse({ status: 200, description: 'Item restored successfully' })
  @ApiResponse({
    status: 400,
    description: 'Bad request - original parent deleted, newParentId required',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Item or parent not found' })
  async restoreStorageItem(@Body() body: RestoreItemDto, @Req() req: RequestWithUser) {
    if (!body.storageId || !body.itemId) {
      throw new BadRequestException('Both Storage ID and Item ID are required.');
    }

    const params = {
      storageId: body.storageId,
      itemId: body.itemId,
      userId: req.user.id,
      newParentId: body.newParentId,
    };

    return await this.storageClient.restoreStorageItem(params);
  }

  @UseGuards(PermissionGuard)
  @RequirePermission(
    ResourceType.STORAGE,
    [AccessRole.ADMIN, AccessRole.WRITE],
    'body',
    'storageId',
  )
  @Post('delete-item-permanent')
  @ApiOperation({ summary: 'Permanently delete a storage item (cannot be restored)' })
  @ApiBody({ type: DeleteItemDto })
  @ApiResponse({ status: 200, description: 'Item permanently deleted' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async permanentDeleteStorageItem(@Body() body: DeleteItemDto, @Req() req: RequestWithUser) {
    if (!body.storageId || !body.itemId) {
      throw new BadRequestException('Both Storage ID and Item ID are required.');
    }

    const params = {
      storageId: body.storageId,
      itemId: body.itemId,
      userId: req.user.id,
    };

    return await this.storageClient.permanentDeleteStorageItem(params);
  }

  @UseGuards(PermissionGuard)
  @RequirePermission(
    ResourceType.STORAGE,
    [AccessRole.ADMIN, AccessRole.READ, AccessRole.WRITE],
    'body',
    'storageId',
  )
  @Post('trash')
  @ApiOperation({ summary: 'Get all items in trash for a storage' })
  @ApiBody({ type: GetStorageDto })
  @ApiResponse({ status: 200, description: 'List of items in trash' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async getTrash(@Body() body: GetStorageDto, @Req() req: RequestWithUser) {
    if (!body.storageId) {
      throw new BadRequestException('Storage ID is required.');
    }

    return await this.storageClient.getTrashItems(body.storageId, req.user.id);
  }

  @Post('update-item-tags')
  @UseGuards(PermissionGuard)
  @RequirePermission(
    ResourceType.STORAGE,
    [AccessRole.ADMIN, AccessRole.WRITE],
    'body',
    'storageId',
  )
  @ApiOperation({ summary: 'Update tags for a storage item' })
  @ApiBody({ type: UpdateStorageItemTagsDto })
  @ApiResponse({ status: 200, description: 'Tags updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async updateStorageItemTags(@Req() req: RequestWithUser, @Body() body: UpdateStorageItemTagsDto) {
    return await this.storageService.updateStorageItemTags(
      req.user.id,
      body.storageId,
      body.itemId,
      body.tags,
    );
  }

  @Post('move-item')
  @UseGuards(PermissionGuard)
  @RequirePermission(
    ResourceType.STORAGE,
    [AccessRole.ADMIN, AccessRole.WRITE],
    'body',
    'storageId',
  )
  @ApiOperation({ summary: 'Move a storage item to another directory' })
  @ApiBody({ type: MoveItemDto })
  @ApiResponse({ status: 200, description: 'Item moved successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - circular dependency or invalid target' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Item or target folder not found' })
  async moveItem(@Req() req: RequestWithUser, @Body() body: MoveItemDto) {
    if (!body.storageId || !body.itemId) {
      throw new BadRequestException('Both Storage ID and Item ID are required.');
    }
    return await this.storageClient.moveStorageItem({
      storageId: body.storageId,
      itemId: body.itemId,
      newParentId: body.newParentId ?? null,
      userId: req.user.id,
    });
  }

  @Post('rename-item')
  @UseGuards(PermissionGuard)
  @RequirePermission(
    ResourceType.STORAGE,
    [AccessRole.ADMIN, AccessRole.WRITE],
    'body',
    'storageId',
  )
  @ApiOperation({ summary: 'Rename a storage item' })
  @ApiBody({ type: RenameItemDto })
  @ApiResponse({ status: 200, description: 'Item renamed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - name already exists or invalid' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async renameItem(@Req() req: RequestWithUser, @Body() body: RenameItemDto) {
    if (!body.storageId || !body.itemId || !body.newName) {
      throw new BadRequestException('Storage ID, Item ID and new name are required.');
    }
    return await this.storageClient.renameStorageItem({
      storageId: body.storageId,
      itemId: body.itemId,
      newName: body.newName,
      userId: req.user.id,
    });
  }

  @Post('copy-item')
  @UseGuards(PermissionGuard)
  @RequirePermission(
    ResourceType.STORAGE,
    [AccessRole.ADMIN, AccessRole.WRITE],
    'body',
    'storageId',
  )
  @ApiOperation({ summary: 'Create a copy of a storage item' })
  @ApiBody({ type: CopyItemDto })
  @ApiResponse({ status: 200, description: 'Item copied successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid target or item already exists' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Item or target folder not found' })
  async copyItem(@Req() req: RequestWithUser, @Body() body: CopyItemDto) {
    if (!body.storageId || !body.itemId) {
      throw new BadRequestException('Both Storage ID and Item ID are required.');
    }
    return await this.storageClient.copyStorageItem({
      storageId: body.storageId,
      itemId: body.itemId,
      targetParentId: body.targetParentId ?? null,
      userId: req.user.id,
    });
  }
}

@ApiTags('Public Storage')
@Controller('public/storage')
export class PublicStorageController {
  constructor(private readonly storageClient: StorageClientService) {}

  @Get(':token')
  @ApiOperation({ summary: 'Get storage item by public token' })
  @ApiResponse({ status: 200, description: 'Storage item retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Item not found or token invalid' })
  async getItemByToken(@Param('token') token: string) {
    return this.storageClient.getStorageItemByToken(token);
  }
}
