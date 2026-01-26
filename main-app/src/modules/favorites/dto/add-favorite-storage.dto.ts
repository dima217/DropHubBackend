import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddFavoriteStorageItemDto {
  @ApiProperty({ description: 'Storage ID', example: '507f1f77bcf86cd799439011' })
  @IsString()
  storageId: string;

  @ApiProperty({
    description: 'Storage item ID to add to favorites',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  itemId: string;
}
