import { IsString, IsNumber, Min } from 'class-validator';

export class UploadInitMultipartDto {
  @IsNumber()
  @Min(1)
  fileSize: number;

  @IsString()
  fileName: string;

  @IsNumber()
  @Min(1)
  totalParts: number;

  @IsString()
  uploadId: string;

  @IsString()
  key: string;

  @IsString()
  roomId: string;

  @IsString()
  fileType: string;
}
