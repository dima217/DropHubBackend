import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class GetAdminStatsDto {
  @ApiPropertyOptional({ example: 30, default: 30, description: 'Analytics window in days' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  @IsOptional()
  days?: number = 30;

  @ApiPropertyOptional({ example: 10, default: 10, description: 'Top items count per metric' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  top?: number = 10;
}
