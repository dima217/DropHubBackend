// upload-confirm.dto.ts
import { IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UploadConfirmDto {
  @ApiProperty({
    description: 'Upload session id',
    example: '65b8f2e1c9a4f123456789ab',
  })
  @IsString()
  @IsNotEmpty()
  uploadId: string;

  @ApiPropertyOptional({
    description: 'Room ID (if upload is for room)',
    example: 'room_123',
  })
  @IsOptional()
  @IsString()
  roomId?: string;

  @ApiPropertyOptional({
    description: 'Storage ID (if upload is for storage)',
    example: 'storage_456',
  })
  @IsOptional()
  @IsString()
  storageId?: string;

  userId: number;
}
