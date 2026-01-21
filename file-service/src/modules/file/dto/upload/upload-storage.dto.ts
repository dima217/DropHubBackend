import { IsNotEmpty, IsUUID } from 'class-validator';
import { UploadBaseDto } from './upload-base.dto';

export class UploadToStorageDto extends UploadBaseDto {
  @IsNotEmpty()
  @IsUUID('4')
  storageId: string;
}

