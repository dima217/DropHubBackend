import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UniversalPermissionService } from './services/permission.service';
import { AccessRole, ResourceType } from './entities/permission.entity';

interface VerifyAccessPayload {
  userId: number;
  resourceId: string;
  resourceType: ResourceType;
  requiredRoles: AccessRole[];
}

@Controller()
export class PermissionController {
  constructor(private readonly permissionService: UniversalPermissionService) {}

  @MessagePattern('permission.verify')
  async verifyAccess(@Payload() payload: VerifyAccessPayload) {
    try {
      const result = await this.permissionService.verifyUserAccess(
        payload.userId,
        payload.resourceId,
        payload.resourceType,
        payload.requiredRoles,
      );
      return result;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      // Return false on error (permission denied)
      return false;
    }
  }
}
