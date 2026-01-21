import { IsNotEmpty, IsUUID } from 'class-validator';
import { UploadBaseDto } from './upload-base.dto';

export class UploadToRoomDto extends UploadBaseDto {
  @IsNotEmpty()
  @IsUUID('4')
  roomId: string;
}

