import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DownloadFileMultipartDto {
  @ApiProperty({ description: 'Upload ID for the file', example: 'abc123' })
  @IsString()
  uploadId: string;

  @ApiProperty({ description: 'Download token (optional)', required: false, example: 'def456' })
  @IsOptional()
  @IsString()
  downloadToken?: string;
}
