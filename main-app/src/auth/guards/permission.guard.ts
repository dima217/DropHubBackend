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
import {
  PERMISSION_KEY,
  PERMISSIONS_ANY_KEY,
  PermissionMetadata,
} from '../common/decorators/permission.decorator';

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
    const anyPermissionMetadata = this.reflector.get<PermissionMetadata[]>(
      PERMISSIONS_ANY_KEY,
      context.getHandler(),
    );

    if (!permissionMetadata && (!anyPermissionMetadata || anyPermissionMetadata.length === 0)) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const checks = anyPermissionMetadata?.length ? anyPermissionMetadata : [permissionMetadata!];

    let lastError: Error | null = null;

    for (const check of checks) {
      const { resourceType, requiredRoles, resourceIdSource, resourceIdField } = check;
      const resourceId = this.extractResourceId(request, resourceIdSource, resourceIdField);
      if (!resourceId) {
        continue;
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
        lastError = error as Error;
      }
    }

    if (lastError instanceof NotFoundException || lastError instanceof ForbiddenException) {
      throw lastError;
    }
    throw new ForbiddenException('Access denied');
  }

  private extractResourceId(
    request: RequestWithUser,
    resourceIdSource: 'body' | 'params' | 'query',
    resourceIdField: string,
  ): string | undefined {
    switch (resourceIdSource) {
      case 'body': {
        const body = request.body as Record<string, unknown>;
        return body?.[resourceIdField] as string | undefined;
      }
      case 'params': {
        const params = request.params as Record<string, string>;
        return params?.[resourceIdField];
      }
      case 'query': {
        const query = request.query as Record<string, string>;
        return query?.[resourceIdField];
      }
      default: {
        const body = request.body as Record<string, unknown>;
        return body?.[resourceIdField] as string | undefined;
      }
    }
  }
}
