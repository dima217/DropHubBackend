import { IsEnum, IsNumber, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ResourceType } from '../entities/permission.entity';

export class RevokePermissionDto {
  @ApiProperty({ description: 'User ID who is revoking the permission', example: 1 })
  @IsNumber()
  actingUserId: number;

  @ApiProperty({ description: 'User ID whose permission will be revoked', example: 2 })
  @IsNumber()
  targetUserId: number;

  @ApiProperty({
    description: 'Resource ID (room ID, storage ID, or file ID)',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  resourceId: string;

  @ApiProperty({ description: 'Type of resource', enum: ResourceType, example: ResourceType.ROOM })
  @IsEnum(ResourceType)
  resourceType: ResourceType;
}

export class RevokeSharedPermissionDto extends RevokePermissionDto {
  @ApiProperty({ description: 'Storage ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  storageId: string;
}
