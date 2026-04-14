import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateFcmTokenDto {
  @ApiPropertyOptional({
    description: 'FCM registration token from the device; omit or null to unregister',
    maxLength: 4096,
  })
  @IsOptional()
  @IsString()
  @MaxLength(4096)
  token?: string | null;
}
