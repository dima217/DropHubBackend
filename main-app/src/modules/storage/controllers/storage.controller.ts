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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
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
import {
  StorageItemResponseDto,
  StorageResponseDto,
  DeleteItemResponseDto,
} from '../dto/responses/storage-item-response.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-guard';
import { PermissionGuard } from 'src/auth/guards/permission.guard';
import { RequirePermission } from 'src/auth/common/decorators/permission.decorator';
import { ResourceType, AccessRole } from 'src/modules/permission/entities/permission.entity';

@ApiTags('Storage')
@ApiExtraModels(StorageItemResponseDto, StorageResponseDto, DeleteItemResponseDto)
@Controller('storage')
@UseGuards(JwtAuthGuard)
export class UserStorageController {
  constructor(
    private readonly storageClient: StorageClientService,
    private readonly storageService: StorageService,
  ) {}

  @Post('/')
  @ApiOperation({
    summary: 'Get all storages for the current user',
    description:
      'Retrieves a list of all storage instances that the authenticated user has access to. Returns storages based on user permissions.',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved list of user storages',
    schema: {
      type: 'array',
      items: { $ref: getSchemaPath(StorageResponseDto) },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing JWT token' })
  async getUserStorages(@Req() req: RequestWithUser) {
    return this.storageService.getStoragesByUserId(req.user.id);
  }

  @Post('create')
  @ApiOperation({
    summary: 'Create a new storage for the current user',
    description:
      'Creates a new storage instance for the authenticated user. The user automatically gets ADMIN permissions for the newly created storage.',
  })
  @ApiResponse({
    status: 201,
    description: 'Storage created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        storageId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
        storage: { $ref: getSchemaPath(StorageResponseDto) },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing JWT token' })
  @ApiResponse({ status: 500, description: 'Internal server error - failed to create storage' })
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
  @ApiOperation({
    summary: 'Create a new storage item (file or directory)',
    description:
      'Creates a new item (file or directory) in the specified storage. For files, fileId must be provided. For directories, fileId should be null. Requires WRITE or ADMIN permissions on the storage.',
  })
  @ApiBody({ type: CreateStorageItemDto })
  @ApiResponse({
    status: 201,
    description: 'Storage item created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        item: { $ref: getSchemaPath(StorageItemResponseDto) },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - missing required fields, invalid fileId for files, or item with same name already exists in parent folder',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user does not have WRITE or ADMIN permissions on the storage',
  })
  @ApiResponse({ status: 404, description: 'Storage or parent folder not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing JWT token' })
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
  @ApiOperation({
    summary: 'Get storage participants',
    description:
      'Retrieves a list of all users who have access to the storage, along with their permission levels (ADMIN, READ, or WRITE).',
  })
  @ApiParam({
    name: 'storageId',
    description: 'Storage ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved list of storage participants',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          userId: { type: 'number', example: 1 },
          role: { type: 'string', enum: ['ADMIN', 'READ', 'WRITE'], example: 'ADMIN' },
          userName: { type: 'string', example: 'John Doe' },
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user does not have READ, WRITE, or ADMIN permissions on the storage',
  })
  @ApiResponse({ status: 404, description: 'Storage not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing JWT token' })
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
  @ApiOperation({
    summary: 'Get full storage structure (complete tree)',
    description:
      'Retrieves the complete hierarchical structure of the storage as a flat list. Each item includes metadata: for files - file metadata (size, mimeType, etc.), for directories - children statistics (total count, files count, folders count).',
  })
  @ApiBody({ type: GetStorageDto })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved full storage structure',
    schema: {
      type: 'array',
      items: { $ref: getSchemaPath(StorageItemResponseDto) },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - storageId is required' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user does not have READ, WRITE, or ADMIN permissions on the storage',
  })
  @ApiResponse({ status: 404, description: 'Storage not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing JWT token' })
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
  @ApiOperation({
    summary: 'Get storage structure (items by parent)',
    description:
      'Retrieves items at a specific level in the storage hierarchy. If parentId is null or not provided, returns root-level items. Each item includes metadata: for files - file metadata (size, mimeType, uploadTime, downloadCount, etc.), for directories - children statistics (childrenCount, filesCount, foldersCount).',
  })
  @ApiBody({ type: GetStructureDto })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved storage structure for the specified parent',
    schema: {
      type: 'array',
      items: { $ref: getSchemaPath(StorageItemResponseDto) },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - storageId is required' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user does not have READ, WRITE, or ADMIN permissions on the storage',
  })
  @ApiResponse({ status: 404, description: 'Storage or parent folder not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing JWT token' })
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
  @ApiOperation({
    summary: 'Soft delete a storage item (move to trash)',
    description:
      'Moves a storage item (file or directory) to the trash. This is a soft delete operation - the item is marked as deleted but not permanently removed. All children of a directory are also moved to trash recursively. Items can be restored using the restore-item endpoint.',
  })
  @ApiBody({ type: DeleteItemDto })
  @ApiResponse({
    status: 200,
    description: 'Item successfully moved to trash',
    schema: { $ref: getSchemaPath(DeleteItemResponseDto) },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - storageId or itemId is missing, or item is already deleted',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user does not have WRITE or ADMIN permissions on the storage',
  })
  @ApiResponse({ status: 404, description: 'Storage or item not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing JWT token' })
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
      'Restores a storage item (file or directory) from the trash back to the storage. All children of a directory are also restored recursively. If the original parent folder was deleted, you must provide newParentId to specify where to restore the item. If newParentId is not provided and the original parent exists, the item is restored to its original location.',
  })
  @ApiBody({ type: RestoreItemDto })
  @ApiResponse({
    status: 200,
    description: 'Item successfully restored from trash',
    schema: { $ref: getSchemaPath(DeleteItemResponseDto) },
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - storageId or itemId is missing, original parent is deleted and newParentId not provided, or target parent is in trash',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user does not have WRITE or ADMIN permissions on the storage',
  })
  @ApiResponse({
    status: 404,
    description: 'Storage, item, or target parent folder not found',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing JWT token' })
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
  @ApiOperation({
    summary: 'Permanently delete a storage item (cannot be restored)',
    description:
      'Permanently deletes a storage item (file or directory) from the system. This operation cannot be undone. All children of a directory are also permanently deleted. The item must be in trash before it can be permanently deleted. Use this endpoint with caution.',
  })
  @ApiBody({ type: DeleteItemDto })
  @ApiResponse({
    status: 200,
    description: 'Item permanently deleted',
    schema: { $ref: getSchemaPath(DeleteItemResponseDto) },
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - storageId or itemId is missing, or item is not in trash (must be soft-deleted first)',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user does not have WRITE or ADMIN permissions on the storage',
  })
  @ApiResponse({ status: 404, description: 'Storage or item not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing JWT token' })
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
  @ApiOperation({
    summary: 'Get all items in trash for a storage',
    description:
      'Retrieves all items that have been soft-deleted (moved to trash) in the specified storage. Items are sorted by deletion time (most recently deleted first). This includes both files and directories that are in the trash.',
  })
  @ApiBody({ type: GetStorageDto })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved list of items in trash',
    schema: {
      type: 'array',
      items: { $ref: getSchemaPath(StorageItemResponseDto) },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - storageId is required' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user does not have READ, WRITE, or ADMIN permissions on the storage',
  })
  @ApiResponse({ status: 404, description: 'Storage not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing JWT token' })
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
  @ApiOperation({
    summary: 'Update tags for a storage item',
    description:
      'Updates the tags associated with a storage item. Tags are useful for organizing and searching items. The tags array completely replaces any existing tags. To remove all tags, send an empty array.',
  })
  @ApiBody({ type: UpdateStorageItemTagsDto })
  @ApiResponse({
    status: 200,
    description: 'Tags updated successfully',
    schema: { $ref: getSchemaPath(StorageItemResponseDto) },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - storageId, itemId, or tags array is missing or invalid',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user does not have WRITE or ADMIN permissions on the storage',
  })
  @ApiResponse({ status: 404, description: 'Storage or item not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing JWT token' })
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
  @ApiOperation({
    summary: 'Move a storage item to another directory',
    description:
      'Moves a storage item (file or directory) to a different parent directory within the same storage. The item cannot be moved to itself or into its own subdirectory (prevents circular dependencies). If newParentId is null, the item is moved to the root level of the storage.',
  })
  @ApiBody({ type: MoveItemDto })
  @ApiResponse({
    status: 200,
    description: 'Item moved successfully',
    schema: { $ref: getSchemaPath(StorageItemResponseDto) },
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - circular dependency detected (trying to move folder into itself or subdirectory), target is not a directory, target is deleted, or item is already in target location',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user does not have WRITE or ADMIN permissions on the storage',
  })
  @ApiResponse({
    status: 404,
    description: 'Storage, item, or target folder not found',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing JWT token' })
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
  @ApiOperation({
    summary: 'Rename a storage item',
    description:
      'Renames a storage item (file or directory). The new name must be unique within the same parent directory. Name cannot be empty or contain only whitespace. Item must not be deleted (restore it first if needed).',
  })
  @ApiBody({ type: RenameItemDto })
  @ApiResponse({
    status: 200,
    description: 'Item renamed successfully',
    schema: { $ref: getSchemaPath(StorageItemResponseDto) },
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - new name is empty, name already exists in the same folder, or item is deleted',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user does not have WRITE or ADMIN permissions on the storage',
  })
  @ApiResponse({ status: 404, description: 'Storage or item not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing JWT token' })
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
  @ApiOperation({
    summary: 'Create a copy of a storage item',
    description:
      'Creates a copy of a storage item (file or directory) in the specified target location. For directories, all children are copied recursively. If a file with the same name exists in the target, the copy will be automatically renamed (e.g., "file (copy)", "file (copy 1)", etc.). The original item remains unchanged. Item must not be deleted (restore it first if needed).',
  })
  @ApiBody({ type: CopyItemDto })
  @ApiResponse({
    status: 200,
    description: 'Item copied successfully',
    schema: { $ref: getSchemaPath(StorageItemResponseDto) },
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - target is not a directory, target is deleted, trying to copy to another storage, or source item is deleted',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user does not have WRITE or ADMIN permissions on the storage',
  })
  @ApiResponse({
    status: 404,
    description: 'Storage, source item, or target folder not found',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing JWT token' })
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
  @ApiOperation({
    summary: 'Get storage item by public token',
    description:
      'Retrieves a storage item using a public share token. This endpoint does not require authentication and can be used to share storage items publicly. The token must be valid and grant at least READ access. If the item is a directory, its children are also included in the response.',
  })
  @ApiParam({
    name: 'token',
    description: 'Public share token for the storage item',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @ApiResponse({
    status: 200,
    description: 'Storage item retrieved successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(StorageItemResponseDto) },
        {
          type: 'object',
          properties: {
            children: {
              type: 'array',
              items: { $ref: getSchemaPath(StorageItemResponseDto) },
              description: 'Children items (only for directories)',
            },
          },
        },
      ],
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - token is invalid, expired, or does not grant read access',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - token does not grant sufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Item not found or token is invalid' })
  async getItemByToken(@Param('token') token: string) {
    return this.storageClient.getStorageItemByToken(token);
  }
}
