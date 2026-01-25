import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RenameItemDto {
  @ApiProperty({ description: 'Storage ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  storageId: string;

  @ApiProperty({ description: 'Item ID to rename', example: '123e4567-e89b-12d3-a456-426614174001' })
  @IsString()
  itemId: string;

  @ApiProperty({ description: 'New name for the item', example: 'New Folder Name' })
  @IsString()
  newName: string;
}

