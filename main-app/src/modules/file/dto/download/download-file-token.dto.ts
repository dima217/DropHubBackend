import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DownloadFileByTokenDto {
  @ApiProperty({ description: 'Download token for public file access', example: 'abc123def456' })
  @IsString()
  downloadToken: string;
}
