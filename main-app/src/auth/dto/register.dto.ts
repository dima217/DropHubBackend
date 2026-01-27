import { IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterUserDto {
  @ApiProperty({ description: 'User email address', example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User password (optional for OAuth registration)',
    required: false,
    example: 'SecurePassword123!',
  })
  @IsOptional()
  @IsString()
  password: string;

  @ApiProperty({ description: 'User first name', example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ description: 'Custom avatar number', example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(6)
  customAvatarNumber?: number;
}
