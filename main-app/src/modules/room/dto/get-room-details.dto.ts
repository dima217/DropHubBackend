import { IsString } from 'class-validator';

export class GetRoomDetailsDto {
  @IsString()
  roomId: string;
}
