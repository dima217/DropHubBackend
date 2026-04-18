import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
} from 'class-validator';

/** Max items per batch request (move, copy, delete, tag). */
export const STORAGE_BATCH_MAX_ITEMS = 100;

export class BatchStorageItemsBaseDto {
  @ApiProperty({ description: 'Storage ID' })
  @IsString()
  storageId: string;

  @ApiPropertyOptional({
    description:
      'Shared root resource ID. When set, scope checks apply for each item (same as single-item endpoints).',
  })
  @IsOptional()
  @IsString()
  resourceId?: string;

  @ApiProperty({
    description: 'Storage item IDs to process',
    type: [String],
    maxItems: STORAGE_BATCH_MAX_ITEMS,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(STORAGE_BATCH_MAX_ITEMS)
  @IsString({ each: true })
  itemIds: string[];
}

export class BatchMoveItemsDto extends BatchStorageItemsBaseDto {
  @ApiPropertyOptional({
    description: 'Target parent folder ID (null = root of storage)',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  newParentId: string | null;
}

export class BatchCopyItemsDto extends BatchStorageItemsBaseDto {
  @ApiPropertyOptional({
    description: 'Target parent folder for all copies (null = root)',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  targetParentId: string | null;
}

export class BatchDeleteItemsDto extends BatchStorageItemsBaseDto {}

export class BatchRestoreItemsDto extends BatchStorageItemsBaseDto {
  @ApiPropertyOptional({
    description:
      'Same as `restore-item`: optional parent for all items when original parent is missing or you want a single target folder.',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  newParentId?: string | null;
}

export class BatchUpdateItemTagsDto extends BatchStorageItemsBaseDto {
  @ApiProperty({
    description: 'Tags applied to every listed item (replaces existing tags on each item)',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  tags: string[];
}
