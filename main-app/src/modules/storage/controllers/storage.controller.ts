import {
  Controller,
  Post,
  Req,
  UseGuards,
  Body,
  BadRequestException,
  Get,
  Param,
  PayloadTooLargeException,
  HttpException,
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
  BatchCopyItemsDto,
  BatchDeleteItemsDto,
  BatchMoveItemsDto,
  BatchRestoreItemsDto,
  BatchUpdateItemTagsDto,
} from '../dto/batch-storage-items.dto';
import {
  StorageItemResponseDto,
  StorageResponseDto,
  DeleteItemResponseDto,
} from '../dto/responses/storage-item-response.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-guard';
import { PermissionGuard } from 'src/auth/guards/permission.guard';
import { RequireAnyPermission, RequirePermission } from 'src/auth/common/decorators/permission.decorator';
import { ResourceType, AccessRole } from 'src/modules/permission/entities/permission.entity';
import { RemoveStorageTagsDto } from '@application/user/dto/remove-storage.tags.dto';
import { ArchiveRoomDto } from '@application/file/dto/archive-room.dto';
import type { UserStorageDto } from '../../file-client/types/storage';
import {
  FileServiceErrorCode,
  getFileServiceRpcPayload,
} from '@application/file/exceptions/file-rcp.error';
import { SharedService } from '../services/shared.service';
import type { DeleteStorageItemResult, StorageItemDto } from '../../file-client/types/storage';

async function getPrimaryUserStorage(
  storageService: StorageService,
  userId: number,
): Promise<(UserStorageDto & { userRole?: string }) | undefined> {
  const storages = await storageService.getStoragesByUserId(userId);
  return storages[0];
}

@ApiTags('Storage')
@ApiExtraModels(StorageItemResponseDto, StorageResponseDto, DeleteItemResponseDto)
@Controller('storage')
@UseGuards(JwtAuthGuard)
export class UserStorageController {
  constructor(
    private readonly storageClient: StorageClientService,
    private readonly storageService: StorageService,
    private readonly sharedService: SharedService,
  ) {}

  private async enforceSharedScopeIfNeeded(
    req: RequestWithUser,
    params: {
      storageId: string;
      resourceId?: string;
      itemId?: string;
      parentId?: string | null;
      targetParentId?: string | null;
      newParentId?: string | null;
    },
  ) {
    if (!params.resourceId) {
      return;
    }
    await this.sharedService.assertSharedMutationScope({
      storageId: params.storageId,
      resourceId: params.resourceId,
      userId: req.user.id,
      itemId: params.itemId,
      parentId: params.parentId,
      targetParentId: params.targetParentId,
      newParentId: params.newParentId,
    });
  }

  private batchErrorMessage(err: unknown): string {
    if (err instanceof HttpException) {
      const r = err.getResponse();
      if (typeof r === 'string') {
        return r;
      }
      if (r && typeof r === 'object' && 'message' in r) {
        const m = (r as { message?: string | string[] }).message;
        return Array.isArray(m) ? m.join(', ') : m ?? err.message;
      }
    }
    if (err instanceof Error) {
      return err.message;
    }
    return 'Unknown error';
  }

  @Get()
  @ApiOperation({
    summary: 'Get primary storage for the current user (REST)',
    description:
      'Returns the first storage the user can access, including `usedBytes` and `maxBytes` for quota UI. Prefer this for GET /storage.',
  })
  @ApiResponse({
    status: 200,
    description: 'Primary user storage (or empty response if none)',
    schema: { $ref: getSchemaPath(StorageResponseDto) },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing JWT token' })
  async getUserStoragesGet(@Req() req: RequestWithUser) {
    return getPrimaryUserStorage(this.storageService, req.user.id);
  }

  @Post('/')
  @ApiOperation({
    summary: 'Get primary storage for the current user (legacy POST)',
    description:
      'Same as GET /storage: returns the first storage the user can access, including quota fields.',
  })
  @ApiResponse({
    status: 200,
    description: 'Primary user storage including quota fields',
    schema: { $ref: getSchemaPath(StorageResponseDto) },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing JWT token' })
  async getUserStorages(@Req() req: RequestWithUser) {
    return getPrimaryUserStorage(this.storageService, req.user.id);
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
  @RequireAnyPermission(
    {
      resourceType: ResourceType.STORAGE,
      requiredRoles: [AccessRole.ADMIN, AccessRole.WRITE],
      resourceIdSource: 'body',
      resourceIdField: 'storageId',
    },
    {
      resourceType: ResourceType.SHARED,
      requiredRoles: [AccessRole.WRITE],
      resourceIdSource: 'body',
      resourceIdField: 'resourceId',
    },
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
    await this.enforceSharedScopeIfNeeded(req, {
      storageId: body.storageId,
      resourceId: body.resourceId,
      parentId: body.parentId ?? body.resourceId ?? null,
    });

    if (body.resourceId) {
      return this.storageClient.createSharedStorageItem({
        userId: req.user.id,
        storageId: body.storageId,
        resourceId: body.resourceId,
        name: body.name,
        isDirectory: body.isDirectory,
        parentId: body.parentId ?? body.resourceId ?? null,
        fileId: body.fileId ?? null,
      });
    }

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
  @RequireAnyPermission(
    {
      resourceType: ResourceType.STORAGE,
      requiredRoles: [AccessRole.ADMIN, AccessRole.READ, AccessRole.WRITE],
      resourceIdSource: 'body',
      resourceIdField: 'storageId',
    },
    {
      resourceType: ResourceType.SHARED,
      requiredRoles: [AccessRole.WRITE, AccessRole.READ],
      resourceIdSource: 'body',
      resourceIdField: 'resourceId',
    },
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

    if (body.resourceId) {
      return this.sharedService.getSharedItemStructure(
        body.storageId,
        body.parentId ?? body.resourceId,
        body.resourceId,
        req.user.id,
      );
    }

    const items = await this.storageClient.getStorageStructure({
      storageId: body.storageId,
      parentId: body.parentId !== undefined ? body.parentId : null,
      userId: req.user.id,
    });

    return this.sharedService.attachSharedParticipantsToOwnedItems(items, req.user.id);
  }

  @UseGuards(PermissionGuard)
  @Post('delete-item')
  @RequireAnyPermission(
    {
      resourceType: ResourceType.STORAGE,
      requiredRoles: [AccessRole.ADMIN, AccessRole.WRITE],
      resourceIdSource: 'body',
      resourceIdField: 'storageId',
    },
    {
      resourceType: ResourceType.SHARED,
      requiredRoles: [AccessRole.WRITE],
      resourceIdSource: 'body',
      resourceIdField: 'resourceId',
    },
  )
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
    await this.enforceSharedScopeIfNeeded(req, {
      storageId: body.storageId,
      resourceId: body.resourceId,
      itemId: body.itemId,
    });
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
  @Post('restore-item')
  @RequireAnyPermission(
    {
      resourceType: ResourceType.STORAGE,
      requiredRoles: [AccessRole.ADMIN, AccessRole.WRITE],
      resourceIdSource: 'body',
      resourceIdField: 'storageId',
    },
    {
      resourceType: ResourceType.SHARED,
      requiredRoles: [AccessRole.WRITE],
      resourceIdSource: 'body',
      resourceIdField: 'resourceId',
    },
  )
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
    await this.enforceSharedScopeIfNeeded(req, {
      storageId: body.storageId,
      resourceId: body.resourceId,
      itemId: body.itemId,
      newParentId: body.newParentId,
    });
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
  @Post('delete-item-permanent')
  @RequireAnyPermission(
    {
      resourceType: ResourceType.STORAGE,
      requiredRoles: [AccessRole.ADMIN, AccessRole.WRITE],
      resourceIdSource: 'body',
      resourceIdField: 'storageId',
    },
    {
      resourceType: ResourceType.SHARED,
      requiredRoles: [AccessRole.WRITE],
      resourceIdSource: 'body',
      resourceIdField: 'resourceId',
    },
  )
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
    await this.enforceSharedScopeIfNeeded(req, {
      storageId: body.storageId,
      resourceId: body.resourceId,
      itemId: body.itemId,
    });
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

  @Post('remove-storage-tags')
  @UseGuards(PermissionGuard)
  @RequirePermission(
    ResourceType.STORAGE,
    [AccessRole.ADMIN, AccessRole.WRITE],
    'body',
    'storageId',
  )
  async removeStorageTags(@Body() body: RemoveStorageTagsDto) {
    return await this.storageClient.removeStorageTags(body.storageId, body.tags);
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

    const items = await this.storageClient.getTrashItems(body.storageId, req.user.id);
    return this.sharedService.attachFileStats(items);
  }

  @Post('update-item-tags')
  @UseGuards(PermissionGuard)
  @RequireAnyPermission(
    {
      resourceType: ResourceType.STORAGE,
      requiredRoles: [AccessRole.ADMIN, AccessRole.WRITE],
      resourceIdSource: 'body',
      resourceIdField: 'storageId',
    },
    {
      resourceType: ResourceType.SHARED,
      requiredRoles: [AccessRole.WRITE],
      resourceIdSource: 'body',
      resourceIdField: 'resourceId',
    },
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
    await this.enforceSharedScopeIfNeeded(req, {
      storageId: body.storageId,
      resourceId: body.resourceId,
      itemId: body.itemId,
    });
    return await this.storageService.updateStorageItemTags(
      req.user.id,
      body.storageId,
      body.itemId,
      body.tags,
      body.resourceId,
    );
  }

  @Post('move-item')
  @UseGuards(PermissionGuard)
  @RequireAnyPermission(
    {
      resourceType: ResourceType.STORAGE,
      requiredRoles: [AccessRole.ADMIN, AccessRole.WRITE],
      resourceIdSource: 'body',
      resourceIdField: 'storageId',
    },
    {
      resourceType: ResourceType.SHARED,
      requiredRoles: [AccessRole.WRITE],
      resourceIdSource: 'body',
      resourceIdField: 'resourceId',
    },
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
    await this.enforceSharedScopeIfNeeded(req, {
      storageId: body.storageId,
      resourceId: body.resourceId,
      itemId: body.itemId,
      newParentId: body.newParentId,
    });
    return await this.storageClient.moveStorageItem({
      storageId: body.storageId,
      itemId: body.itemId,
      newParentId: body.newParentId ?? null,
      userId: req.user.id,
    });
  }

  @Post('rename-item')
  @UseGuards(PermissionGuard)
  @RequireAnyPermission(
    {
      resourceType: ResourceType.STORAGE,
      requiredRoles: [AccessRole.ADMIN, AccessRole.WRITE],
      resourceIdSource: 'body',
      resourceIdField: 'storageId',
    },
    {
      resourceType: ResourceType.SHARED,
      requiredRoles: [AccessRole.WRITE],
      resourceIdSource: 'body',
      resourceIdField: 'resourceId',
    },
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
    await this.enforceSharedScopeIfNeeded(req, {
      storageId: body.storageId,
      resourceId: body.resourceId,
      itemId: body.itemId,
    });
    return await this.storageClient.renameStorageItem({
      storageId: body.storageId,
      itemId: body.itemId,
      newName: body.newName,
      userId: req.user.id,
    });
  }

  @Post('copy-item')
  @UseGuards(PermissionGuard)
  @RequireAnyPermission(
    {
      resourceType: ResourceType.STORAGE,
      requiredRoles: [AccessRole.ADMIN, AccessRole.WRITE],
      resourceIdSource: 'body',
      resourceIdField: 'storageId',
    },
    {
      resourceType: ResourceType.SHARED,
      requiredRoles: [AccessRole.WRITE],
      resourceIdSource: 'body',
      resourceIdField: 'resourceId',
    },
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
    await this.enforceSharedScopeIfNeeded(req, {
      storageId: body.storageId,
      resourceId: body.resourceId,
      itemId: body.itemId,
      targetParentId: body.targetParentId,
    });
    try {
      return await this.storageClient.copyStorageItem({
        storageId: body.storageId,
        itemId: body.itemId,
        targetParentId: body.targetParentId ?? null,
        userId: req.user.id,
      });
    } catch (err) {
      const rpc = getFileServiceRpcPayload(err);
      if (rpc?.code === FileServiceErrorCode.StorageQuotaExceeded) {
        throw new PayloadTooLargeException(rpc.message ?? 'Storage quota exceeded');
      }
      throw err;
    }
  }

  @Post('batch-move-item')
  @UseGuards(PermissionGuard)
  @RequireAnyPermission(
    {
      resourceType: ResourceType.STORAGE,
      requiredRoles: [AccessRole.ADMIN, AccessRole.WRITE],
      resourceIdSource: 'body',
      resourceIdField: 'storageId',
    },
    {
      resourceType: ResourceType.SHARED,
      requiredRoles: [AccessRole.WRITE],
      resourceIdSource: 'body',
      resourceIdField: 'resourceId',
    },
  )
  @ApiOperation({
    summary: 'Move multiple storage items to the same parent folder',
    description:
      'Applies the same `newParentId` to every `itemId`. Each item is validated independently; failures do not stop other items.',
  })
  @ApiBody({ type: BatchMoveItemsDto })
  @ApiResponse({ status: 200, description: 'Per-item results' })
  async batchMoveItems(@Req() req: RequestWithUser, @Body() body: BatchMoveItemsDto) {
    if (!body.storageId?.trim()) {
      throw new BadRequestException('storageId is required');
    }
    const itemIds = [...new Set(body.itemIds)];
    const results: Array<{
      itemId: string;
      success: boolean;
      item?: StorageItemDto;
      error?: string;
    }> = [];
    for (const itemId of itemIds) {
      try {
        await this.enforceSharedScopeIfNeeded(req, {
          storageId: body.storageId,
          resourceId: body.resourceId,
          itemId,
          newParentId: body.newParentId ?? null,
        });
        const item = await this.storageClient.moveStorageItem({
          storageId: body.storageId,
          itemId,
          newParentId: body.newParentId ?? null,
          userId: req.user.id,
        });
        results.push({ itemId, success: true, item });
      } catch (err) {
        results.push({ itemId, success: false, error: this.batchErrorMessage(err) });
      }
    }
    return {
      total: itemIds.length,
      succeeded: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  }

  @Post('batch-copy-item')
  @UseGuards(PermissionGuard)
  @RequireAnyPermission(
    {
      resourceType: ResourceType.STORAGE,
      requiredRoles: [AccessRole.ADMIN, AccessRole.WRITE],
      resourceIdSource: 'body',
      resourceIdField: 'storageId',
    },
    {
      resourceType: ResourceType.SHARED,
      requiredRoles: [AccessRole.WRITE],
      resourceIdSource: 'body',
      resourceIdField: 'resourceId',
    },
  )
  @ApiOperation({
    summary: 'Copy multiple storage items into the same target folder',
    description:
      'Each source item is copied under `targetParentId`. Quota errors are reported per item.',
  })
  @ApiBody({ type: BatchCopyItemsDto })
  @ApiResponse({ status: 200, description: 'Per-item results' })
  async batchCopyItems(@Req() req: RequestWithUser, @Body() body: BatchCopyItemsDto) {
    if (!body.storageId?.trim()) {
      throw new BadRequestException('storageId is required');
    }
    const itemIds = [...new Set(body.itemIds)];
    const results: Array<{
      itemId: string;
      success: boolean;
      item?: StorageItemDto;
      error?: string;
    }> = [];
    for (const itemId of itemIds) {
      try {
        await this.enforceSharedScopeIfNeeded(req, {
          storageId: body.storageId,
          resourceId: body.resourceId,
          itemId,
          targetParentId: body.targetParentId ?? null,
        });
        const item = await this.storageClient.copyStorageItem({
          storageId: body.storageId,
          itemId,
          targetParentId: body.targetParentId ?? null,
          userId: req.user.id,
        });
        results.push({ itemId, success: true, item });
      } catch (err) {
        const rpc = getFileServiceRpcPayload(err);
        if (rpc?.code === FileServiceErrorCode.StorageQuotaExceeded) {
          results.push({
            itemId,
            success: false,
            error: rpc.message ?? 'Storage quota exceeded',
          });
        } else {
          results.push({ itemId, success: false, error: this.batchErrorMessage(err) });
        }
      }
    }
    return {
      total: itemIds.length,
      succeeded: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  }

  @Post('batch-delete-item')
  @UseGuards(PermissionGuard)
  @RequireAnyPermission(
    {
      resourceType: ResourceType.STORAGE,
      requiredRoles: [AccessRole.ADMIN, AccessRole.WRITE],
      resourceIdSource: 'body',
      resourceIdField: 'storageId',
    },
    {
      resourceType: ResourceType.SHARED,
      requiredRoles: [AccessRole.WRITE],
      resourceIdSource: 'body',
      resourceIdField: 'resourceId',
    },
  )
  @ApiOperation({
    summary: 'Soft-delete multiple storage items (move to trash)',
    description: 'Same as `delete-item` but for many `itemId`s; each item is processed independently.',
  })
  @ApiBody({ type: BatchDeleteItemsDto })
  @ApiResponse({ status: 200, description: 'Per-item results' })
  async batchDeleteItems(@Req() req: RequestWithUser, @Body() body: BatchDeleteItemsDto) {
    if (!body.storageId?.trim()) {
      throw new BadRequestException('storageId is required');
    }
    const itemIds = [...new Set(body.itemIds)];
    const results: Array<{
      itemId: string;
      success: boolean;
      data?: DeleteStorageItemResult;
      error?: string;
    }> = [];
    for (const itemId of itemIds) {
      try {
        await this.enforceSharedScopeIfNeeded(req, {
          storageId: body.storageId,
          resourceId: body.resourceId,
          itemId,
        });
        const data = await this.storageClient.deleteStorageItem({
          storageId: body.storageId,
          itemId,
          userId: req.user.id,
        });
        results.push({ itemId, success: true, data });
      } catch (err) {
        results.push({ itemId, success: false, error: this.batchErrorMessage(err) });
      }
    }
    return {
      total: itemIds.length,
      succeeded: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  }

  @Post('batch-restore-item')
  @UseGuards(PermissionGuard)
  @RequireAnyPermission(
    {
      resourceType: ResourceType.STORAGE,
      requiredRoles: [AccessRole.ADMIN, AccessRole.WRITE],
      resourceIdSource: 'body',
      resourceIdField: 'storageId',
    },
    {
      resourceType: ResourceType.SHARED,
      requiredRoles: [AccessRole.WRITE],
      resourceIdSource: 'body',
      resourceIdField: 'resourceId',
    },
  )
  @ApiOperation({
    summary: 'Restore multiple storage items from trash',
    description:
      'Same as `restore-item` per id: optional `newParentId` applies to every item (e.g. when originals are gone).',
  })
  @ApiBody({ type: BatchRestoreItemsDto })
  @ApiResponse({ status: 200, description: 'Per-item results' })
  async batchRestoreItems(@Req() req: RequestWithUser, @Body() body: BatchRestoreItemsDto) {
    if (!body.storageId?.trim()) {
      throw new BadRequestException('storageId is required');
    }
    const itemIds = [...new Set(body.itemIds)];
    const results: Array<{
      itemId: string;
      success: boolean;
      data?: DeleteStorageItemResult;
      error?: string;
    }> = [];
    for (const itemId of itemIds) {
      try {
        await this.enforceSharedScopeIfNeeded(req, {
          storageId: body.storageId,
          resourceId: body.resourceId,
          itemId,
          newParentId: body.newParentId,
        });
        const data = await this.storageClient.restoreStorageItem({
          storageId: body.storageId,
          itemId,
          userId: req.user.id,
          newParentId: body.newParentId,
        });
        results.push({ itemId, success: true, data });
      } catch (err) {
        results.push({ itemId, success: false, error: this.batchErrorMessage(err) });
      }
    }
    return {
      total: itemIds.length,
      succeeded: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  }

  @Post('batch-delete-item-permanent')
  @UseGuards(PermissionGuard)
  @RequireAnyPermission(
    {
      resourceType: ResourceType.STORAGE,
      requiredRoles: [AccessRole.ADMIN, AccessRole.WRITE],
      resourceIdSource: 'body',
      resourceIdField: 'storageId',
    },
    {
      resourceType: ResourceType.SHARED,
      requiredRoles: [AccessRole.WRITE],
      resourceIdSource: 'body',
      resourceIdField: 'resourceId',
    },
  )
  @ApiOperation({
    summary: 'Permanently delete multiple items from trash',
    description:
      'Same rules as `delete-item-permanent`: each item must already be in trash (soft-deleted). Irreversible per successful item.',
  })
  @ApiBody({ type: BatchDeleteItemsDto })
  @ApiResponse({ status: 200, description: 'Per-item results' })
  async batchPermanentDeleteItems(@Req() req: RequestWithUser, @Body() body: BatchDeleteItemsDto) {
    if (!body.storageId?.trim()) {
      throw new BadRequestException('storageId is required');
    }
    const itemIds = [...new Set(body.itemIds)];
    const results: Array<{
      itemId: string;
      success: boolean;
      data?: DeleteStorageItemResult;
      error?: string;
    }> = [];
    for (const itemId of itemIds) {
      try {
        await this.enforceSharedScopeIfNeeded(req, {
          storageId: body.storageId,
          resourceId: body.resourceId,
          itemId,
        });
        const data = await this.storageClient.permanentDeleteStorageItem({
          storageId: body.storageId,
          itemId,
          userId: req.user.id,
        });
        results.push({ itemId, success: true, data });
      } catch (err) {
        results.push({ itemId, success: false, error: this.batchErrorMessage(err) });
      }
    }
    return {
      total: itemIds.length,
      succeeded: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  }

  @Post('batch-update-item-tags')
  @UseGuards(PermissionGuard)
  @RequireAnyPermission(
    {
      resourceType: ResourceType.STORAGE,
      requiredRoles: [AccessRole.ADMIN, AccessRole.WRITE],
      resourceIdSource: 'body',
      resourceIdField: 'storageId',
    },
    {
      resourceType: ResourceType.SHARED,
      requiredRoles: [AccessRole.WRITE],
      resourceIdSource: 'body',
      resourceIdField: 'resourceId',
    },
  )
  @ApiOperation({
    summary: 'Set tags on multiple storage items',
    description:
      'The same `tags` array replaces existing tags on each listed item (same semantics as `update-item-tags`).',
  })
  @ApiBody({ type: BatchUpdateItemTagsDto })
  @ApiResponse({ status: 200, description: 'Per-item results' })
  async batchUpdateItemTags(@Req() req: RequestWithUser, @Body() body: BatchUpdateItemTagsDto) {
    if (!body.storageId?.trim()) {
      throw new BadRequestException('storageId is required');
    }
    const itemIds = [...new Set(body.itemIds)];
    const results: Array<{
      itemId: string;
      success: boolean;
      item?: StorageItemDto;
      error?: string;
    }> = [];
    for (const itemId of itemIds) {
      try {
        await this.enforceSharedScopeIfNeeded(req, {
          storageId: body.storageId,
          resourceId: body.resourceId,
          itemId,
        });
        const { item } = await this.storageService.updateStorageItemTags(
          req.user.id,
          body.storageId,
          itemId,
          body.tags,
          body.resourceId,
        );
        results.push({ itemId, success: true, item });
      } catch (err) {
        results.push({ itemId, success: false, error: this.batchErrorMessage(err) });
      }
    }
    return {
      total: itemIds.length,
      succeeded: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  }

  @Post('archive-room')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(
    ResourceType.STORAGE,
    [AccessRole.ADMIN, AccessRole.WRITE],
    'body',
    'storageId',
  )
  async archiveRoom(@Body() body: ArchiveRoomDto, @Req() req: RequestWithUser) {
    return this.storageService.archiveRoomToStorage(
      req.user.id,
      body.storageId,
      body.roomId,
      body.parentId ?? null,
      body.fileIds,
    );
  }
}
