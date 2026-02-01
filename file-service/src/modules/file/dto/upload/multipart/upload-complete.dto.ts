import { IsString, IsArray, IsNumber } from 'class-validator';

class PartDto {
  @IsString()
  ETag: string;

  @IsNumber()
  PartNumber: number;
}

export class UploadCompleteDto {
  @IsString()
  uploadId: string;

  @IsArray()
  parts: PartDto[];

  @IsString()
  roomId: string;

  @IsString()
  fileName: string;

  @IsNumber()
  fileSize: number;

  @IsString()
  fileType: string;
}
