import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RestoreItemDto {
  @ApiProperty({ description: 'Storage ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  storageId: string;

  @ApiProperty({
    description: 'Item ID to restore',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsString()
  itemId: string;

  @ApiProperty({
    description: 'New parent ID (optional, required if original parent is deleted)',
    example: '123e4567-e89b-12d3-a456-426614174002',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  newParentId?: string | null;
}
