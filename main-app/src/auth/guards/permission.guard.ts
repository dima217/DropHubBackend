import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RequestWithUser } from 'src/types/express';
import { UniversalPermissionService } from 'src/modules/permission/services/permission.service';
import { PERMISSION_KEY, PermissionMetadata } from '../common/decorators/permission.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly permissionService: UniversalPermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permissionMetadata = this.reflector.get<PermissionMetadata>(
      PERMISSION_KEY,
      context.getHandler(),
    );

    if (!permissionMetadata) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const { resourceType, requiredRoles, resourceIdSource, resourceIdField } = permissionMetadata;

    let resourceId: string | undefined;

    switch (resourceIdSource) {
      case 'body': {
        const body = request.body as Record<string, unknown>;
        resourceId = body?.[resourceIdField] as string | undefined;
        break;
      }
      case 'params': {
        const params = request.params as Record<string, string>;
        resourceId = params?.[resourceIdField];
        break;
      }
      case 'query': {
        const query = request.query as Record<string, string>;
        resourceId = query?.[resourceIdField];
        break;
      }
      default: {
        const body = request.body as Record<string, unknown>;
        resourceId = body?.[resourceIdField] as string | undefined;
        break;
      }
    }

    if (!resourceId) {
      throw new NotFoundException(
        `Resource ID not found in ${resourceIdSource}.${resourceIdField}`,
      );
    }

    try {
      await this.permissionService.verifyUserAccess(
        user.id,
        resourceId,
        resourceType,
        requiredRoles,
      );
      return true;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new ForbiddenException('Access denied');
    }
  }
}
