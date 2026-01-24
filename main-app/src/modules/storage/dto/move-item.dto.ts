import { IsOptional, IsString } from 'class-validator';

export class MoveItemDto {
  @IsString()
  storageId: string;

  @IsString()
  itemId: string;

  @IsOptional()
  @IsString()
  newParentId: string | null;
}

