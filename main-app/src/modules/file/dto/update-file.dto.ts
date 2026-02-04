import { IsString } from 'class-validator';

export class UpdateFileDto {
  @IsString()
  roomId: string;

  @IsString()
  fileId: string;

  @IsString()
  storedName: string;
}
