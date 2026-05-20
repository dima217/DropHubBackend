import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class GetAdminUserStoragesDto {
  @ApiPropertyOptional({ example: 1, default: 1, description: 'Page number (1-based)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 50, default: 50, description: 'Items per page' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  @IsOptional()
  limit?: number = 50;

  @ApiPropertyOptional({
    enum: ['all', 'deleted', 'pending'],
    default: 'all',
    description: 'Filter: all items | soft-deleted | pending permanent delete',
  })
  @IsIn(['all', 'deleted', 'pending'])
  @IsOptional()
  filter?: 'all' | 'deleted' | 'pending' = 'all';
}
