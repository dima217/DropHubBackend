// 📁 src/modules/file/dto/upload/upload.storage.dto.ts

import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UploadFileBaseDto } from './upload-base.dto';

export class UploadInitDto {
  @ApiProperty({
    description: 'Storage ID where the file will be uploaded',
    example: '507f1f77bcf86cd799439011',
  })
  @IsOptional()
  @IsString()
  roomId: string;

  @IsOptional()
  @IsString()
  storageId: string;

  files: UploadFileBaseDto[];
}
