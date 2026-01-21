import { Body, Controller, Post } from '@nestjs/common';
import { UniversalPermissionService } from '../services/permission.service';
import { GrantPermissionDto } from '../dto/grant-permission.dto';
import { RevokePermissionDto } from '../dto/revoke-permission.dto';

@Controller('/permission')
export class PermissionController {
  constructor(private readonly permissionService: UniversalPermissionService) {}

  @Post('/grant')
  async grantPermission(@Body() granPermissionDto: GrantPermissionDto) {
    return this.permissionService.grantPermission(granPermissionDto);
  }

  @Post('/revoke')
  async revokePermission(@Body() revokePermissionDto: RevokePermissionDto) {
    await this.permissionService.revokePermission(revokePermissionDto);
    return { message: 'Permission revoked successfully.' };
  }
}
