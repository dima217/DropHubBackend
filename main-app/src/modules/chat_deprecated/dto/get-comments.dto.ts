import { IsString } from 'class-validator';

export class GetCommentsDto {
  @IsString()
  roomId: string;
}
