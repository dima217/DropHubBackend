import { IsString } from 'class-validator';

export class AddFavoriteStorageItemDto {
  @IsString()
  storageId: string;

  @IsString()
  itemId: string;
}
