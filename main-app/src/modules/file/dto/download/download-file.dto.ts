import { IsString } from 'class-validator';

export class DownloadFileDto {
  @IsString()
  fileId: string;
}
