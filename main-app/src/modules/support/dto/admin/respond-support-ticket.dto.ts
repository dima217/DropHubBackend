import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { SupportTicketStatus } from '../../entities/support-ticket.entity';

export class RespondSupportTicketDto {
  @ApiProperty({ example: 'Проверили. Доступ восстановлен, смените пароль и включите 2FA.' })
  @IsString()
  @MinLength(3)
  response: string;

  @ApiPropertyOptional({
    enum: [SupportTicketStatus.IN_PROGRESS, SupportTicketStatus.RESOLVED],
    example: SupportTicketStatus.IN_PROGRESS,
  })
  @IsOptional()
  @IsEnum(SupportTicketStatus)
  status?: SupportTicketStatus;
}
