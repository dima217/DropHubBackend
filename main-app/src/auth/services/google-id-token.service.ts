import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';

export type GoogleIdTokenProfile = {
  email: string;
  firstName: string;
  avatarUrl: string | null;
};

@Injectable()
export class GoogleIdTokenService {
  private readonly client = new OAuth2Client();

  constructor(private readonly configService: ConfigService) {}

  async verifyAndExtractProfile(idToken: string): Promise<GoogleIdTokenProfile> {
    const audiences = this.configService.get<string[]>('google.idTokenAudiences') ?? [];
    if (!audiences.length) {
      throw new UnauthorizedException(
        'Google ID token verification is not configured (set GOOGLE_CLIENT_ID or GOOGLE_ID_TOKEN_AUDIENCES)',
      );
    }

    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: audiences.length === 1 ? audiences[0] : audiences,
      });
      const payload = ticket.getPayload();
      if (!payload?.email) {
        throw new UnauthorizedException('Google token has no email');
      }

      return {
        email: payload.email,
        firstName:
          payload.given_name?.trim() || payload.name?.trim() || '',
        avatarUrl: payload.picture ?? null,
      };
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new UnauthorizedException('Invalid or expired Google ID token');
    }
  }
}
