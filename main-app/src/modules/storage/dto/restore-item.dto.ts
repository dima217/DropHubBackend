import { IsOptional, IsString } from 'class-validator';

export class RestoreItemDto {
  @IsString()
  storageId: string;

  @IsString()
  itemId: string;

  @IsOptional()
  @IsString()
  newParentId?: string | null;
}

