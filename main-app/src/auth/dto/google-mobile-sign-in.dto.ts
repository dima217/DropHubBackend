import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleMobileSignInDto {
  @ApiProperty({
    description:
      'Google ID token from native Sign-In (Android/iOS). Not an access token.',
    example: 'eyJhbGciOiJSUzI1NiIs...',
  })
  @IsString()
  @IsNotEmpty()
  idToken: string;
}
