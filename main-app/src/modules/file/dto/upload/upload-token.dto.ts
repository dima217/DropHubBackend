import { IsNotEmpty, IsString, IsOptional, IsUUID } from 'class-validator';
import { UploadBaseDto } from './upload-base.dto';

export class UploadByTokenDto extends UploadBaseDto {
  @IsNotEmpty()
  @IsString()
  uploadToken: string;

  @IsOptional()
  @IsUUID('4')
  roomId?: string;

  @IsOptional()
  @IsUUID('4')
  storageId?: string;
}
