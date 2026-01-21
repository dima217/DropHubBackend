import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class CreateUserDto {
  @ApiProperty({ description: 'User full name' })
  @IsEmail()
  email: string;

  @IsEnum(UserRole)
  role: UserRole;

  @ApiProperty({ description: 'User full password' })
  @IsString()
  @MinLength(6)
  password: string;

  @IsBoolean()
  @IsOptional()
  isOAuthUser: boolean;
}
