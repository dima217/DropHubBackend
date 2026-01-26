// src/relationships/dto/friend-request.dto.ts
import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendRequestDto {
  @ApiProperty({ description: 'Email address of the user to send friend request to', example: 'friend@example.com' })
  @IsNotEmpty()
  @IsEmail()
  email: string;
}
