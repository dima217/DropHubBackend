import { IsString, IsNumber, Min, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadInitMultipartDto {
  @ApiProperty({ description: 'Total file size in bytes', example: 10485760, minimum: 1 })
  @IsNumber()
  @Min(1)
  fileSize: number;

  @ApiProperty({ description: 'Original file name', example: 'large-video.mp4' })
  @IsString()
  fileName: string;

  @ApiProperty({ description: 'Total number of parts for multipart upload', example: 10, minimum: 1 })
  @IsNumber()
  @Min(1)
  totalParts: number;

  @ApiProperty({ description: 'Upload ID for tracking the multipart upload', example: 'abc123' })
  @IsString()
  uploadId: string;

  @ApiProperty({ description: 'S3 object key', example: 'uploads/file.mp4' })
  @IsString()
  key: string;

  @ApiProperty({ description: 'Room ID where the file will be uploaded', example: '507f1f77bcf86cd799439011' })
  @IsString()
  roomId: string;

  @ApiProperty({ description: 'File MIME type', example: 'video/mp4' })
  @IsString()
  fileType: string;

  @ApiProperty({ description: 'User ID (optional, auto-detected from auth)', required: false, example: 1 })
  @IsOptional()
  @IsNumber()
  userId?: number;

  @ApiProperty({ description: 'IP address (optional, auto-detected)', required: false, example: '192.168.1.1' })
  @IsOptional()
  @IsString()
  ip?: string;
}
