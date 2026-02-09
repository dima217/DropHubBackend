import { ApiProperty } from '@nestjs/swagger';
import { UploadConfirmDto } from './upload.confirm.dto';
import { IsString } from 'class-validator';

export class UploadConfirmSharedDto extends UploadConfirmDto {
  @ApiProperty({ description: 'Resource ID', example: '123' })
  @IsString()
  resourceId: string;
}
