import { IsString, IsOptional, IsArray, IsEnum, IsNumber } from 'class-validator';

export enum SearchResourceType {
  ROOM = 'room',
  STORAGE = 'storage',
  ALL = 'all',
}

export class SearchDto {
  @IsOptional()
  @IsString()
  query?: string; // Поиск по названию

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[]; // Поиск по тегам (только для storage items)

  @IsOptional()
  @IsString()
  mimeType?: string; // Поиск по типу файла (только для файлов)

  @IsOptional()
  @IsNumber()
  creatorId?: number; // Поиск по создателю

  @IsOptional()
  @IsEnum(SearchResourceType)
  resourceType?: SearchResourceType; // Тип ресурса для поиска (ROOM, STORAGE, ALL)

  @IsOptional()
  @IsNumber()
  limit?: number; // Лимит результатов

  @IsOptional()
  @IsNumber()
  offset?: number; // Смещение для пагинации
}
