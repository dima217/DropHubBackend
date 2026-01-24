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
import { JwtAuthGuard } from 'src/auth/guards/jwt-guard';
import { PermissionGuard } from 'src/auth/guards/permission.guard';
import { RequirePermission } from 'src/auth/common/decorators/permission.decorator';
import { ResourceType, AccessRole } from 'src/modules/permission/entities/permission.entity';

@Controller('storage')
@UseGuards(JwtAuthGuard)
export class UserStorageController {
  constructor(
    private readonly storageClient: StorageClientService,
    private readonly storageService: StorageService,
  ) {}

  @Post('/')
  async getUserStorages(@Req() req: RequestWithUser) {
    return this.storageService.getStoragesByUserId(req.user.id);
  }

  @Post('create')
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
}

@Controller('public/storage')
export class PublicStorageController {
  constructor(private readonly storageClient: StorageClientService) {}

  @Get(':token')
  async getItemByToken(@Param('token') token: string) {
    return this.storageClient.getStorageItemByToken(token);
  }
}
