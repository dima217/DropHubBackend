import { Body, Controller, NotFoundException, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GetSharedItemsDto } from '@application/user/dto/shared/get-shared.items.dto';
import { SharedService } from '../services/shared.service';
import type { RequestWithUser } from 'src/types/express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-guard';
import { GrantSharedPermissionDto } from '@application/permission/dto/grant-permission.dto';
import { AccessRole, ResourceType } from '@application/permission/entities/permission.entity';
import { UniversalPermissionService } from '@application/permission/services/permission.service';
import { PermissionGuard } from 'src/auth/guards/permission.guard';
import { RequirePermission } from 'src/auth/common/decorators/permission.decorator';
import { RevokeSharedPermissionDto } from '@application/permission/dto/revoke-permission.dto';
import { GetItemStructureDto } from '../dto/shared/get-item.structure.dto';
import { StorageClientService } from '@application/file-client';
import { GetSharedItemParticipantsDto } from '../dto/shared/get-shared.item.participants.dto';

@Controller('shared')
@ApiTags('Shared')
export class SharedController {
  constructor(
    private readonly sharedService: SharedService,
    private readonly permissionService: UniversalPermissionService,
    private readonly storageClient: StorageClientService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('/get-items')
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

  @Post('/get-item-structure')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(ResourceType.SHARED, [AccessRole.WRITE, AccessRole.READ], 'body', 'resourceId')
  @ApiBody({ type: GetItemStructureDto })
  @ApiOperation({
    summary: 'Get item structure',
    description: 'Get item structure',
  })
  async getItemStructure(
    @Req() req: RequestWithUser,
    @Body() getItemStructureDto: GetItemStructureDto,
  ) {
    return this.sharedService.getSharedItemStructure(
      getItemStructureDto.storageId,
      getItemStructureDto.parentId ?? getItemStructureDto.resourceId ?? null,
      getItemStructureDto.resourceId,
      req.user.id,
    );
  }

  @Post('/grant-permission')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(ResourceType.STORAGE, [AccessRole.ADMIN], 'body', 'storageId')
  @ApiBody({ type: GrantSharedPermissionDto })
  @ApiOperation({
    summary: 'Grant permission to shared item',
    description: 'Grant permission to shared item',
  })
  @ApiResponse({
    status: 200,
    description: 'Permission granted successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async grantPermission(
    @Req() req: RequestWithUser,
    @Body() grantPermissionDto: GrantSharedPermissionDto,
  ) {
    const isItemInStorage = await this.sharedService.isItemInStorage(
      grantPermissionDto.resourceId,
      grantPermissionDto.storageId,
    );
    if (!isItemInStorage) {
      throw new NotFoundException('Item not found in storage');
    }
    return this.permissionService.grantSharedPermission({
      actingUserId: req.user.id,
      targetUserId: grantPermissionDto.targetUserId,
      resourceId: grantPermissionDto.resourceId,
      resourceType: ResourceType.SHARED,
      role: grantPermissionDto.role,
    });
  }

  @Post('/revoke-permission')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(ResourceType.STORAGE, [AccessRole.ADMIN], 'body', 'storageId')
  @ApiBody({ type: RevokeSharedPermissionDto })
  @ApiOperation({
    summary: 'Revoke permission from shared item',
    description: 'Revoke permission from shared item',
  })
  @ApiResponse({ status: 200, description: 'Permission revoked successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async revokePermission(
    @Req() req: RequestWithUser,
    @Body() revokePermissionDto: RevokeSharedPermissionDto,
  ) {
    return this.permissionService.revokeSharedPermission({
      actingUserId: req.user.id,
      targetUserId: revokePermissionDto.targetUserId,
      resourceId: revokePermissionDto.resourceId,
      resourceType: ResourceType.SHARED,
    });
  }

  @Post('/get-item-participants')
  @UseGuards(JwtAuthGuard)
  @ApiBody({ type: GetSharedItemParticipantsDto })
  @ApiOperation({
    summary: 'Get shared item participants',
    description: 'Get shared item participants',
  })
  async getSharedItemParticipants(
    @Req() req: RequestWithUser,
    @Body() getSharedItemParticipantsDto: GetSharedItemParticipantsDto,
  ) {
    return this.sharedService.getSharedItemParticipants(getSharedItemParticipantsDto.itemId);
  }
}
