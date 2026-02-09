import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class GetSharedItemParticipantsDto {
  @ApiProperty({ description: 'Item ID', example: '507f1f77bcf86cd799439011' })
  @IsString()
  itemId: string;
}
