import { IsEmail, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailCodeDto {
  @ApiProperty({ description: 'Email address to verify', example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: '8-digit verification code', example: '12345678', minLength: 8, maxLength: 8 })
  @IsString()
  @Length(8, 8)
  code: string;
}
