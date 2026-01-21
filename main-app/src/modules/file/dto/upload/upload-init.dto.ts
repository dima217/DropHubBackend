import { IsNumber, Min } from 'class-validator';

export class UploadInitDto {
  @IsNumber()
  @Min(1)
  fileSize: number;
}
