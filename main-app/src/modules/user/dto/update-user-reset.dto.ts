import { IsString, IsDate, IsOptional } from 'class-validator';

export class UpdateUserResetDto {
  @IsOptional()
  @IsString()
  resetPasswordToken?: string | null;

  @IsOptional()
  @IsDate()
  tokenExpiredDate?: Date | null;
}
