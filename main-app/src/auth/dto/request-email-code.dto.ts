import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestEmailCodeDto {
  @ApiProperty({
    description: 'Email address to send verification code to',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;
}
