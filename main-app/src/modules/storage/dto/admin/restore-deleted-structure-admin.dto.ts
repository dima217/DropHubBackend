import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RestoreDeletedStructureAdminDto {
  @ApiProperty({
    description: 'Deleted root item id to restore',
    example: '67f0ac5de7bb8bc8a4f0dba1',
  })
  @IsString()
  itemId: string;

  @ApiPropertyOptional({
    description:
      'Optional new parent directory id. Use null to restore to root, omit to try original parent.',
    example: '67f0ac5de7bb8bc8a4f0dbb2',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  newParentId?: string | null;
}
