import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RemoveFavoriteStorageItemDto {
  @ApiProperty({
    description: 'Storage item ID to remove from favorites',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  itemId: string;
}
