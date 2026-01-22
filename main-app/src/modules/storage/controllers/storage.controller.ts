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
import type { RequestWithUser } from 'src/types/express';
import { GetStorageDto } from '../dto/get-storage.dto';
import { GetStructureDto } from '../dto/get-structure.dto';
import { DeleteItemDto } from '../dto/delete-item.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-guard';
import { PermissionGuard } from 'src/auth/guards/permission.guard';
import { RequirePermission } from 'src/auth/common/decorators/permission.decorator';
import { ResourceType, AccessRole } from 'src/modules/permission/entities/permission.entity';

@Controller('storage')
@UseGuards(JwtAuthGuard)
export class UserStorageController {
  constructor(private readonly storageClient: StorageClientService) {}

  @Post('/')
  async getUserStorages(@Req() req: RequestWithUser) {
    return this.storageClient.getStoragesByUserId(req.user.id);
  }

  @UseGuards(PermissionGuard)
  @RequirePermission(ResourceType.STORAGE, [AccessRole.ADMIN, AccessRole.READ, AccessRole.WRITE], 'body', 'storageId')
  @Post('full-tree')
  async getFullStorageStructure(@Body() body: GetStorageDto, @Req() req: RequestWithUser) {
    if (!body.storageId) {
      throw new BadRequestException('Storage ID is required.');
    }
    return this.storageClient.getFullStorageStructure(body.storageId, req.user.id);
  }

  @UseGuards(PermissionGuard)
  @RequirePermission(ResourceType.STORAGE, [AccessRole.ADMIN, AccessRole.READ, AccessRole.WRITE], 'body', 'storageId')
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
  @RequirePermission(ResourceType.STORAGE, [AccessRole.ADMIN, AccessRole.WRITE], 'body', 'storageId')
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

    return this.storageClient.deleteStorageItem(params);
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
