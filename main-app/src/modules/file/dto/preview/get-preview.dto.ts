import { IsString } from 'class-validator';

export class GetPreviewDto {
  @IsString()
  fileId: string;
}
