import { IsEnum, IsNumber, IsString } from 'class-validator';
import { AccessRole, ResourceType } from '../entities/permission.entity';

export class GrantPermissionDto {
  @IsNumber()
  actingUserId: number;

  @IsNumber()
  targetUserId: number;

  @IsString()
  resourceId: string;

  @IsEnum(ResourceType)
  resourceType: ResourceType;

  @IsEnum(AccessRole)
  role: AccessRole;
}
