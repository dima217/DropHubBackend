import { IsString } from 'class-validator';

export class CreateRoomDto {
  @IsString()
  username?: string;
}
