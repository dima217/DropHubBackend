import { IsString, IsNumber, IsOptional, IsObject, IsArray, IsEnum } from 'class-validator';
import { FileUploadStatus } from '../interfaces/interfaces';

export class UploadSessionDto {
  @IsString()
  uploadId: string;

  @IsEnum(FileUploadStatus)
  status: FileUploadStatus;

  @IsArray()
  uploadedParts?: number[];
}

export class CreateFileMetaDto {
  @IsString()
  originalName: string;

  @IsString()
  key: string;

  @IsNumber()
  size: number;

  @IsString()
  mimeType: string;

  @IsString()
  uploaderIp?: string;

  @IsOptional()
  @IsObject()
  uploadSession?: UploadSessionDto;
}
