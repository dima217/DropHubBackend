import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class GetItemStructureDto {
  @ApiProperty({ description: 'Storage ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  storageId: string;

  @ApiProperty({ description: 'Item ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  resourceId: string;

  @ApiProperty({ description: 'Parent ID', example: '123e4567-e89b-12d3-a456-426614174001' })
  @IsString()
  @IsOptional()
  parentId?: string | null;
}
