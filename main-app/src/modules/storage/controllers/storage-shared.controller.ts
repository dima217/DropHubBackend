import {
  Body,
  Controller,
  NotFoundException,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-guard';
import { PermissionGuard } from 'src/auth/guards/permission.guard';
import { RequireAnyPermission } from 'src/auth/common/decorators/permission.decorator';
import { AccessRole, ResourceType } from '@application/permission/entities/permission.entity';
import type { RequestWithUser } from 'src/types/express';
import { GetSharedItemsDto } from '@application/user/dto/shared/get-shared.items.dto';
import { SharedService } from '../services/shared.service';
import { GrantSharedPermissionDto } from '@application/permission/dto/grant-permission.dto';
import { UniversalPermissionService } from '@application/permission/services/permission.service';
import { PushEventsService } from '@application/push/push-events.service';
import { RevokeSharedPermissionDto } from '@application/permission/dto/revoke-permission.dto';
import { GetSharedItemParticipantsDto } from '../dto/shared/get-shared.item.participants.dto';

@ApiTags('Shared')
@Controller('storage/shared')
@UseGuards(JwtAuthGuard)
export class StorageSharedController {
  constructor(
    private readonly sharedService: SharedService,
    private readonly permissionService: UniversalPermissionService,
    private readonly pushEvents: PushEventsService,
  ) {}

  @Post('get-items')
  @ApiBody({ type: GetSharedItemsDto })
  @ApiOperation({
    summary: 'Get shared items',
    description: 'Get shared items by item ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Shared items retrieved successfully',
  })
  async getSharedItems(@Req() req: RequestWithUser) {
    return this.sharedService.getSharedItems(req.user.id);
  }

  @Post('grant-permission')
  @UseGuards(PermissionGuard)
  @RequireAnyPermission(
    {
      resourceType: ResourceType.STORAGE,
      requiredRoles: [AccessRole.ADMIN],
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
  @ApiBody({ type: GrantSharedPermissionDto })
  async grantSharedPermission(@Req() req: RequestWithUser, @Body() dto: GrantSharedPermissionDto) {
    const isItemInStorage = await this.sharedService.isItemInStorage(dto.resourceId, dto.storageId);
    if (!isItemInStorage) {
      throw new NotFoundException('Item not found in storage');
    }
    const permission = await this.permissionService.grantSharedPermission({
      actingUserId: req.user.id,
      targetUserId: dto.targetUserId,
      resourceId: dto.resourceId,
      resourceType: ResourceType.SHARED,
      role: dto.role,
    });
    void this.pushEvents.notifySharedAccessGranted(req.user.id, dto.targetUserId, dto.resourceId);
    return permission;
  }

  @Post('revoke-permission')
  @UseGuards(PermissionGuard)
  @RequireAnyPermission(
    {
      resourceType: ResourceType.STORAGE,
      requiredRoles: [AccessRole.ADMIN],
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
  @ApiBody({ type: RevokeSharedPermissionDto })
  async revokeSharedPermission(@Req() req: RequestWithUser, @Body() dto: RevokeSharedPermissionDto) {
    return this.permissionService.revokeSharedPermission({
      actingUserId: req.user.id,
      targetUserId: dto.targetUserId,
      resourceId: dto.resourceId,
      resourceType: ResourceType.SHARED,
    });
  }

  @Post('get-item-participants')
  @ApiBody({ type: GetSharedItemParticipantsDto })
  async getSharedItemParticipants(@Body() dto: GetSharedItemParticipantsDto) {
    return this.sharedService.getSharedItemParticipants(dto.itemId);
  }
}
