import { BadRequestException, Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-guard';
import { RolesGuard } from 'src/auth/guards/roles-guard';
import { Roles } from 'src/auth/common/decorators/role.decorator';
import { StorageService } from '../services/storage.service';
import { RestoreDeletedStructureAdminDto } from '../dto/admin/restore-deleted-structure-admin.dto';

@ApiTags('Storage Admin')
@Controller('storage/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class StorageAdminController {
  constructor(private readonly storageService: StorageService) {}

  @Get('users/:userId/storages')
  @ApiOperation({
    summary: 'Admin: get one user storages with full tree',
    description:
      'Returns storages for selected user only. Each storage contains full structure including deleted and pending permanent deletion items.',
  })
  async getAdminUserStorages(@Param('userId') userId: string) {
    const parsedUserId = Number(userId);
    if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) {
      throw new BadRequestException('Valid userId is required.');
    }
    return this.storageService.getAdminUserStoragesWithDeleted(parsedUserId);
  }

  @Post('restore-deleted-structure')
  @ApiOperation({
    summary: 'Admin: restore deleted storage structure',
    description:
      'Restores a previously permanently-deleted storage structure (root + children) back into user tree before retention expires.',
  })
  async restoreDeletedStructureForAdmin(@Body() body: RestoreDeletedStructureAdminDto) {
    return this.storageService.restoreDeletedStructureAdmin(body.itemId, body.newParentId);
  }
}
