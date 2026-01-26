import { IsString, IsArray, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class PartDto {
  @ApiProperty({ description: 'ETag of the uploaded part', example: '"d41d8cd98f00b204e9800998ecf8427e"' })
  @IsString()
  ETag: string;

  @ApiProperty({ description: 'Part number (1-indexed)', example: 1 })
  @IsNumber()
  PartNumber: number;
}

export class UploadCompleteDto {
  @ApiProperty({ description: 'Upload ID for the multipart upload', example: 'abc123' })
  @IsString()
  uploadId: string;

  @ApiProperty({ description: 'Array of uploaded parts with ETags', type: [PartDto] })
  @IsArray()
  parts: PartDto[];

  @ApiProperty({ description: 'Room ID where the file was uploaded', example: '507f1f77bcf86cd799439011' })
  @IsString()
  roomId: string;

  @ApiProperty({ description: 'Original file name', example: 'large-video.mp4' })
  @IsString()
  fileName: string;

  @ApiProperty({ description: 'Total file size in bytes', example: 10485760 })
  @IsNumber()
  fileSize: number;

  @ApiProperty({ description: 'File MIME type', example: 'video/mp4' })
  @IsString()
  fileType: string;
}
