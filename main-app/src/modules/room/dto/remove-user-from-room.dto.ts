import { IsString, IsNumber, IsArray, ArrayMinSize } from 'class-validator';

export class RemoveUserFromRoomDto {
  @IsString()
  roomId: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsNumber({}, { each: true })
  targetUserIds: number[];
}
