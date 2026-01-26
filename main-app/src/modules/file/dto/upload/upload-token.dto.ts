import { IsNotEmpty, IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UploadBaseDto } from './upload-base.dto';

export class UploadByTokenDto extends UploadBaseDto {
  @ApiProperty({ description: 'Upload token for public file upload', example: 'abc123def456' })
  @IsNotEmpty()
  @IsString()
  uploadToken: string;

  @ApiProperty({ description: 'Room ID (optional)', required: false, example: '507f1f77bcf86cd799439011' })
  @IsOptional()
  @IsUUID('4')
  roomId?: string;

  @ApiProperty({ description: 'Storage ID (optional)', required: false, example: '507f1f77bcf86cd799439011' })
  @IsOptional()
  @IsUUID('4')
  storageId?: string;
}
