import { IsEmail, IsString, Length } from 'class-validator';

export class VerifyEmailCodeDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(8, 8)
  code: string;
}
