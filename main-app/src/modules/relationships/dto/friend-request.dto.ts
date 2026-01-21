// src/relationships/dto/friend-request.dto.ts
import { IsEmail, IsNotEmpty } from 'class-validator';

export class SendRequestDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;
}
