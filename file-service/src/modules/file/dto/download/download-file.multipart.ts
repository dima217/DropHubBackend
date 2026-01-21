import { IsString } from 'class-validator';

export class DownloadFileMultipartDto {
  @IsString()
  uploadId: string;

  @IsString()
  downloadToken?: string;
}

