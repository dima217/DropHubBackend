import { IsArray, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ArchiveRoomDto {
  @ApiProperty({
    description: 'Room ID to archive',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  roomId: string;

  @ApiProperty({
    description: 'Storage ID where to archive',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsString()
  storageId: string;

  @ApiProperty({
    description: 'Parent ID in storage (optional, null for root level)',
    example: '123e4567-e89b-12d3-a456-426614174002',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  parentId: string | null;

  @ApiProperty({
    description:
      'Array of file IDs to archive (optional, if not provided all files will be archived)',
    example: ['123e4567-e89b-12d3-a456-426614174003', '123e4567-e89b-12d3-a456-426614174004'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fileIds?: string[];
}
