import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateAnonymousSupportTicketDto {
  @ApiProperty({ example: 'Украли аккаунт' })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  title: string;

  @ApiProperty({ example: 'Подозреваю взлом, нужен доступ и блокировка сессий.' })
  @IsString()
  @MinLength(10)
  details: string;

  @ApiPropertyOptional({ example: 'safe-mail@example.com' })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;
}
