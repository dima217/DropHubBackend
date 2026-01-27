import { IsEmail, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailCodeDto {
  @ApiProperty({ description: 'Email address to verify', example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: '6-digit verification code',
    example: '123456',
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  @Length(6, 6)
  code: string;
}
