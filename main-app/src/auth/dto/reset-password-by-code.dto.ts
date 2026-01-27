import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, MinLength } from 'class-validator';

export class ResetPasswordByCodeDto {
  @ApiProperty({
    description: 'User email address for password reset',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: '6-digit verification code sent to the user email',
    example: '123456',
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  @Length(6, 6)
  code: string;

  @ApiProperty({
    description: 'New password to set for the user account',
    example: 'StrongPassword123!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  newPassword: string;
}


