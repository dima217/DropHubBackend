import { IsString } from 'class-validator';

export class GetFilesDto {
  @IsString()
  roomId: string;
}
