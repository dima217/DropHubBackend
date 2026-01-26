// 📁 src/modules/file/dto/upload/upload.storage.dto.ts

import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UploadBaseDto } from './upload-base.dto';

export class UploadToStorageDto extends UploadBaseDto {
  @ApiProperty({ description: 'Storage ID where the file will be uploaded', example: '507f1f77bcf86cd799439011' })
  @IsNotEmpty()
  @IsUUID('4')
  storageId: string;
}
