/**
 * Browser-only OAuth2 redirect flow (Passport). Mobile apps should call POST /auth/google/mobile
 * with the ID token from Google Sign-In SDK instead.
 */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';
import { AuthService } from '../services/auth.service';
import { UserRole } from 'src/modules/user/entities/user.entity';
import { Profile as UserProfile } from 'src/modules/user/entities/profile.entity';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('google.clientId') ?? '',
      clientSecret: configService.get<string>('google.clientSecret') ?? '',
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: {
      emails?: { value: string }[];
      name?: { givenName?: string; familyName?: string };
      displayName?: string;
      photos?: { value: string }[];
    },
  ): Promise<{ id: number; profile: UserProfile; role: UserRole }> {
    const email = profile.emails?.[0]?.value;
    const firstName =
      profile.name?.givenName?.trim() ||
      profile.displayName?.trim() ||
      profile.name?.familyName?.trim() ||
      '';
    const avatarUrl = profile.photos?.[0]?.value ?? null;

    return this.authService.validateGoogleProfile({
      email: email ?? '',
      firstName,
      avatarUrl,
    });
  }
}
