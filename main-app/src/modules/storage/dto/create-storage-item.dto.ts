import { IsString, IsBoolean, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateStorageItemDto {
  @ApiProperty({ description: 'Storage ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsUUID('4')
  storageId: string;

  @ApiProperty({ description: 'Item name', example: 'My Folder' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Whether the item is a directory', example: true })
  @IsBoolean()
  isDirectory: boolean;

  @ApiProperty({
    description: 'Parent ID (optional, null for root level)',
    example: '123e4567-e89b-12d3-a456-426614174001',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @IsUUID('4')
  parentId?: string | null;

  @ApiProperty({
    description: 'File ID (required for files, not for directories)',
    example: '123e4567-e89b-12d3-a456-426614174002',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @IsUUID('4')
  fileId?: string | null;
}

