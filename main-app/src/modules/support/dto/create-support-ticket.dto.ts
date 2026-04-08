import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateSupportTicketDto {
  @ApiProperty({ example: 'Не могу войти в аккаунт' })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  title: string;

  @ApiProperty({ example: 'После смены телефона не приходит код подтверждения.' })
  @IsString()
  @MinLength(10)
  details: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Если true, обращение будет создано без привязки к аккаунту',
  })
  @IsOptional()
  @IsBoolean()
  anonymous?: boolean;
}
