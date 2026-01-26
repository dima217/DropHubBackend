import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ResourceType } from 'src/modules/permission/entities/permission.entity';

export class GetCommentsDto {
  @ApiProperty({ description: 'Resource ID (room ID or storage ID)', example: '507f1f77bcf86cd799439011' })
  @IsString()
  resourceId: string;

  @ApiProperty({ description: 'Type of resource', enum: ResourceType, example: ResourceType.ROOM })
  @IsEnum(ResourceType)
  resourceType: ResourceType;

  @ApiProperty({ description: 'Storage item ID (optional, for storage items)', required: false, example: '507f1f77bcf86cd799439011' })
  @IsOptional()
  @IsString()
  itemId?: string;

  @ApiProperty({ description: 'File ID (optional, for files in rooms)', required: false, example: '507f1f77bcf86cd799439011' })
  @IsOptional()
  @IsString()
  fileId?: string;
}
