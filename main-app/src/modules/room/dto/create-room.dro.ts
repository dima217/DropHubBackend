import { IsISO8601, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRoomDto {
  @ApiProperty({
    description: 'Username for the room (optional)',
    required: false,
    example: 'my-room',
  })
  @IsString()
  username?: string;

  @ApiProperty({
    description: 'Room expiration date (ISO string)',
    required: false,
    example: '2026-02-01T12:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601()
  expiresAt?: string;
}
