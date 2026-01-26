import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ResourceType } from 'src/modules/permission/entities/permission.entity';

export class CreateCommentDto {
  @ApiProperty({ description: 'Resource ID (room ID or storage ID)', example: '507f1f77bcf86cd799439011' })
  @IsString()
  resourceId: string;

  @ApiProperty({ description: 'Type of resource', enum: ResourceType, example: ResourceType.ROOM })
  @IsEnum(ResourceType)
  resourceType: ResourceType;

  @ApiProperty({ description: 'Storage item ID (for storage items)', required: false, example: '507f1f77bcf86cd799439011' })
  @IsOptional()
  @IsString()
  itemId?: string; // Для элементов стора

  @ApiProperty({ description: 'File ID (for files in rooms)', required: false, example: '507f1f77bcf86cd799439011' })
  @IsOptional()
  @IsString()
  fileId?: string; // Для файлов в комнатах

  @ApiProperty({ description: 'Comment content', example: 'This is a comment' })
  @IsString()
  content: string;
}
