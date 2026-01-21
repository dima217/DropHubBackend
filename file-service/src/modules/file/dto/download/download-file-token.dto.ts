import { IsString } from 'class-validator';

export class DownloadFileByTokenDto {
  @IsString()
  downloadToken: string;
}

