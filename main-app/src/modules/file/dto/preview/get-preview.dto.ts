import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetPreviewDto {
  @ApiProperty({ description: 'File ID to get preview for', example: '507f1f77bcf86cd799439011' })
  @IsString()
  fileId: string;
}
