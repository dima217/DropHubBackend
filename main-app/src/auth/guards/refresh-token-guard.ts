import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { RefreshTokenRequest } from 'src/types/express';

@Injectable()
export class RefreshTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RefreshTokenRequest>();

    let token: string | undefined;
    const isMobileApp = request.headers['x-client-type'] === 'mobile-app';
    const isBrowser = !isMobileApp;

    if (isBrowser) {
      token = request.cookies?.['refreshToken'];
    } else {
      const authHeader = request.headers['authorization'];
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.slice(7);
      }
    }

    if (!token) {
      throw new UnauthorizedException('No refresh token provided');
    }

    request.refreshToken = token;
    request.isBrowser = isBrowser;

    return true;
  }
}
