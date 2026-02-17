import { IsString, IsOptional, IsArray, IsEnum, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum SearchResourceType {
  ROOM = 'room',
  STORAGE = 'storage',
  ALL = 'all',
}

export class SearchDto {
  @ApiProperty({ description: 'Search query by name', required: false, example: 'document' })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiProperty({
    description: 'Search by tags (only for storage items)',
    required: false,
    type: [String],
    example: ['important', 'work'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({
    description: 'Search by file MIME type (only for files)',
    required: false,
    example: 'image/png',
  })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiProperty({
    description: 'Search by file MIME types - filter by multiple types (only for files)',
    required: false,
    type: [String],
    example: ['image/png', 'image/jpeg'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mimeTypes?: string[];

  @ApiProperty({ description: 'Search by creator user ID', required: false, example: 1 })
  @IsOptional()
  @IsNumber()
  creatorId?: number;

  @ApiProperty({
    description: 'Resource type to search (ROOM, STORAGE, ALL)',
    enum: SearchResourceType,
    required: false,
    example: SearchResourceType.ALL,
  })
  @IsOptional()
  @IsEnum(SearchResourceType)
  resourceType?: SearchResourceType;

  @ApiProperty({
    description: 'Maximum number of results',
    required: false,
    example: 20,
    default: 50,
  })
  @IsOptional()
  @IsNumber()
  limit?: number;

  @ApiProperty({ description: 'Offset for pagination', required: false, example: 0, default: 0 })
  @IsOptional()
  @IsNumber()
  offset?: number;
}
