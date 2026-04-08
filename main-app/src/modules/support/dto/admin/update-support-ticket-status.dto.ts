import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { SupportTicketStatus } from '../../entities/support-ticket.entity';

export class UpdateSupportTicketStatusDto {
  @ApiProperty({ enum: SupportTicketStatus, example: SupportTicketStatus.RESOLVED })
  @IsEnum(SupportTicketStatus)
  status: SupportTicketStatus;
}
