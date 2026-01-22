import { IsString, IsArray } from 'class-validator';

export class UpdateStorageItemTagsDto {
  @IsString()
  storageId: string;

  @IsString()
  itemId: string;

  @IsArray()
  @IsString({ each: true })
  tags: string[];
}
