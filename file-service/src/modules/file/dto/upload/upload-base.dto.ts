import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UploadBaseDto {
  @IsString()
  originalName: string;

  @IsNumber()
  fileSize: number;

  @IsString()
  mimeType: string;

  @IsOptional()
  @IsString()
  uploaderIp?: string;
}
