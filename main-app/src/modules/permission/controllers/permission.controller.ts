import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { UniversalPermissionService } from '../services/permission.service';
import { GrantPermissionDto } from '../dto/grant-permission.dto';
import { RevokePermissionDto } from '../dto/revoke-permission.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-guard';
import type { RequestWithUser } from 'src/types/express';

@ApiTags('Permissions')
@Controller('/permission')
export class PermissionController {
  constructor(private readonly permissionService: UniversalPermissionService) {}

  @Post('/grant')
  @ApiOperation({
    summary: 'Grant permission',
    description:
      'Grants a permission (READ, WRITE, or ADMIN) to a user for a specific resource (room, storage, or file).',
  })
  @ApiBody({ type: GrantPermissionDto })
  @ApiResponse({
    status: 200,
    description: 'Permission granted successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1 },
        actingUserId: { type: 'number', example: 1 },
        targetUserId: { type: 'number', example: 2 },
        resourceId: { type: 'string', example: '507f1f77bcf86cd799439011' },
        resourceType: { type: 'string', example: 'ROOM' },
        role: { type: 'string', example: 'READ' },
      },
    },
  })
  // eslint-disable-next-line prettier/prettier
  @ApiResponse({ status: 400, description: 'Bad request - permission already exists or invalid data' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - acting user lacks permission to grant permissions',
  })
  @UseGuards(JwtAuthGuard)
  async grantPermission(
    @Req() req: RequestWithUser,
    @Body() granPermissionDto: GrantPermissionDto,
  ) {
    return this.permissionService.grantPermission({
      ...granPermissionDto,
      actingUserId: req.user.id,
    });
  }

  @Post('/revoke')
  @ApiOperation({
    summary: 'Revoke permission',
    description: 'Revokes a permission from a user for a specific resource.',
  })
  @ApiBody({ type: RevokePermissionDto })
  @ApiResponse({
    status: 200,
    description: 'Permission revoked successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Permission revoked successfully.' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - acting user lacks permission to revoke permissions',
  })
  @ApiResponse({ status: 404, description: 'Permission not found' })
  async revokePermission(
    @Req() req: RequestWithUser,
    @Body() revokePermissionDto: RevokePermissionDto,
  ) {
    await this.permissionService.revokePermission({
      actingUserId: req.user.id,
      ...revokePermissionDto,
    });
    return { message: 'Permission revoked successfully.' };
  }
}
