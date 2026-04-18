import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MoveItemDto {
  @ApiProperty({ description: 'Storage ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  storageId: string;

  @ApiProperty({ description: 'Item ID to move', example: '123e4567-e89b-12d3-a456-426614174001' })
  @IsString()
  itemId: string;

  @ApiProperty({
    description: 'New parent ID (null for root level)',
    example: '123e4567-e89b-12d3-a456-426614174002',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  newParentId: string | null;

  @ApiProperty({
    description: 'Shared root resource ID (optional, enables shared scope checks)',
    example: '123e4567-e89b-12d3-a456-426614174999',
    required: false,
  })
  @IsOptional()
  @IsString()
  resourceId?: string;
}

