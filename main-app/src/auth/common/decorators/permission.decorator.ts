import { SetMetadata } from '@nestjs/common';
import { AccessRole, ResourceType } from 'src/modules/permission/entities/permission.entity';

export const PERMISSION_KEY = 'permission';

export interface PermissionMetadata {
  resourceType: ResourceType;
  requiredRoles: AccessRole[];
  resourceIdSource: 'body' | 'params' | 'query';
  resourceIdField: string;
}

export const RequirePermission = (
  resourceType: ResourceType,
  requiredRoles: AccessRole[],
  resourceIdSource: 'body' | 'params' | 'query' = 'body',
  resourceIdField: string = 'resourceId',
) =>
  SetMetadata(PERMISSION_KEY, {
    resourceType,
    requiredRoles,
    resourceIdSource,
    resourceIdField,
  } as PermissionMetadata);
