import { IsEnum, IsNumber, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AccessRole, ResourceType } from '../entities/permission.entity';

export class GrantPermissionDto {
  @ApiProperty({ description: 'User ID who is granting the permission', example: 1 })
  @IsNumber()
  actingUserId: number;

  @ApiProperty({ description: 'User ID who will receive the permission', example: 2 })
  @IsNumber()
  targetUserId: number;

  @ApiProperty({ description: 'Resource ID (room ID, storage ID, or file ID)', example: '507f1f77bcf86cd799439011' })
  @IsString()
  resourceId: string;

  @ApiProperty({ description: 'Type of resource', enum: ResourceType, example: ResourceType.ROOM })
  @IsEnum(ResourceType)
  resourceType: ResourceType;

  @ApiProperty({ description: 'Access role to grant', enum: AccessRole, example: AccessRole.READ })
  @IsEnum(AccessRole)
  role: AccessRole;
}
