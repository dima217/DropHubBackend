// 📁 src/modules/file/dto/upload/upload.base.dto.ts

import { IsNumber, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadFileBaseDto {
  @ApiProperty({ description: 'Original file name', example: 'document.pdf' })
  @IsString()
  originalName: string;

  @ApiProperty({ description: 'File size in bytes', example: 1024000 })
  @IsNumber()
  fileSize: number;

  @ApiProperty({ description: 'File MIME type', example: 'application/pdf' })
  @IsString()
  mimeType: string;
}
