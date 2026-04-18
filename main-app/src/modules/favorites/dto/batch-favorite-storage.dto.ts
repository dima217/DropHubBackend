import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsString } from 'class-validator';
import { STORAGE_BATCH_MAX_ITEMS } from '../../storage/dto/batch-storage-items.dto';

export class BatchAddFavoriteStorageItemsDto {
  @ApiProperty({ description: 'Storage ID' })
  @IsString()
  storageId: string;

  @ApiProperty({
    description: 'Item IDs to add to favorites',
    type: [String],
    maxItems: STORAGE_BATCH_MAX_ITEMS,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(STORAGE_BATCH_MAX_ITEMS)
  @IsString({ each: true })
  itemIds: string[];
}

export class BatchRemoveFavoriteStorageItemsDto {
  @ApiProperty({
    description: 'Item IDs to remove from favorites',
    type: [String],
    maxItems: STORAGE_BATCH_MAX_ITEMS,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(STORAGE_BATCH_MAX_ITEMS)
  @IsString({ each: true })
  itemIds: string[];
}
