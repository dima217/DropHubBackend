import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetStructureDto {
  @ApiProperty({ description: 'Storage ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  storageId: string;

  @ApiProperty({
    description: 'Parent ID (optional, null for root level)',
    example: '123e4567-e89b-12d3-a456-426614174001',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  parentId?: string | null;
}
