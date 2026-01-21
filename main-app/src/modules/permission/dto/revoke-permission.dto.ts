import { IsEnum, IsNumber, IsString } from 'class-validator';
import { AccessRole, ResourceType } from '../entities/permission.entity';

export class RevokePermissionDto {
  @IsNumber()
  actingUserId: number;

  @IsNumber()
  targetUserId: number;

  @IsString()
  resourceId: string;

  @IsEnum(ResourceType)
  resourceType: ResourceType;
}
