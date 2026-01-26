import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DownloadFileDto {
  @ApiProperty({ description: 'File ID to download', example: '507f1f77bcf86cd799439011' })
  @IsString()
  fileId: string;
}
