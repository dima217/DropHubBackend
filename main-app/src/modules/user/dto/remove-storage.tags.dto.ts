import { IsArray, IsString, ArrayNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RemoveStorageTagsDto {
  @ApiProperty({ description: 'Storage ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  storageId: string;

  @ApiProperty({ description: 'Array of tags to remove', example: ['tag1', 'tag2'] })
  @IsArray()
  @ArrayNotEmpty()
  tags: string[];
}
