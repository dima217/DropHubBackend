import { IsString, IsNumber, IsArray, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RemoveUserFromRoomDto {
  @ApiProperty({ description: 'Room ID', example: '507f1f77bcf86cd799439011' })
  @IsString()
  roomId: string;

  @ApiProperty({ description: 'Array of user IDs to remove from the room', type: [Number], example: [1, 2] })
  @IsArray()
  @ArrayMinSize(1)
  @IsNumber({}, { each: true })
  targetUserIds: number[];
}
