import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRoomDto {
  @ApiProperty({ description: 'Username for the room (optional)', required: false, example: 'my-room' })
  @IsOptional()
  @IsString()
  username?: string;
}
