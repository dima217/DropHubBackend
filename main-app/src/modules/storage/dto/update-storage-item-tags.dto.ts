import { IsString, IsArray, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateStorageItemTagsDto {
  @ApiProperty({ description: 'Storage ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  storageId: string;

  @ApiProperty({ description: 'Item ID', example: '123e4567-e89b-12d3-a456-426614174001' })
  @IsString()
  itemId: string;

  @ApiProperty({
    description: 'Array of tags',
    example: ['work', 'important', 'project'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  tags: string[];

  @ApiProperty({
    description: 'Shared root resource ID (optional, enables shared scope checks)',
    example: '123e4567-e89b-12d3-a456-426614174999',
    required: false,
  })
  @IsOptional()
  @IsString()
  resourceId?: string;
}
