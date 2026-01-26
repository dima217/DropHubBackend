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
  query?: string; // Поиск по названию

  @ApiProperty({ description: 'Search by tags (only for storage items)', required: false, type: [String], example: ['important', 'work'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[]; // Поиск по тегам (только для storage items)

  @ApiProperty({ description: 'Search by file MIME type (only for files)', required: false, example: 'image/png' })
  @IsOptional()
  @IsString()
  mimeType?: string; // Поиск по типу файла (только для файлов)

  @ApiProperty({ description: 'Search by creator user ID', required: false, example: 1 })
  @IsOptional()
  @IsNumber()
  creatorId?: number; // Поиск по создателю

  @ApiProperty({ description: 'Resource type to search (ROOM, STORAGE, ALL)', enum: SearchResourceType, required: false, example: SearchResourceType.ALL })
  @IsOptional()
  @IsEnum(SearchResourceType)
  resourceType?: SearchResourceType; // Тип ресурса для поиска (ROOM, STORAGE, ALL)

  @ApiProperty({ description: 'Maximum number of results', required: false, example: 20, default: 50 })
  @IsOptional()
  @IsNumber()
  limit?: number; // Лимит результатов

  @ApiProperty({ description: 'Offset for pagination', required: false, example: 0, default: 0 })
  @IsOptional()
  @IsNumber()
  offset?: number; // Смещение для пагинации
}
