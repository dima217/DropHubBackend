import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class BanUserDto {
  @ApiProperty({ example: true, description: 'true to ban, false to unban' })
  @IsBoolean()
  isBanned: boolean;
}
