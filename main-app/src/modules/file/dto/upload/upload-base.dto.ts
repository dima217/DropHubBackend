// 📁 src/modules/file/dto/upload/upload.base.dto.ts

import { IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadBaseDto {
  @ApiProperty({ description: 'Original file name', example: 'document.pdf' })
  @IsString()
  originalName: string;

  @ApiProperty({ description: 'File size in bytes', example: 1024000 })
  @IsNumber()
  fileSize: number;

  @ApiProperty({ description: 'File MIME type', example: 'application/pdf' })
  @IsString()
  mimeType: string;

  @ApiProperty({ description: 'Uploader IP address (optional, auto-detected)', required: false, example: '192.168.1.1' })
  @IsOptional()
  @IsString()
  uploaderIp?: string;
}
