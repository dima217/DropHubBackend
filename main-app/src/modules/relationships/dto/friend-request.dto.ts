// src/relationships/dto/friend-request.dto.ts
import { IsInt, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendRequestDto {
  @ApiProperty({
    description: 'Email address of the user to send friend request to',
    example: 'friend@example.com',
  })
  @IsNotEmpty()
  @IsInt()
  profileId: number;
}
