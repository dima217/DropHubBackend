import { IsString } from 'class-validator';

export class RemoveFavoriteStorageItemDto {
  @IsString()
  itemId: string;
}
