import { IsString } from 'class-validator';

export class DeleteItemDto {
  @IsString()
  storageId: string;

  @IsString()
  itemId: string;
}
