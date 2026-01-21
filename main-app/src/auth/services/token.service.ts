/* eslint-disable @typescript-eslint/no-unused-vars */
import { UsersService } from '@application/user/services/user.service';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '../types';
import * as argon2 from 'argon2';

@Injectable()
export class TokenService {
  constructor(
    private jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  generateAccessToken(userId: number) {
    return this.jwtService.sign({ id: userId });
  }

  generateRefreshToken(userId: number) {
    return this.jwtService.sign(
      { id: userId },
      {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      },
    );
  }

  async refreshToken(token: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const logger = new Logger('AuthService.refreshToken');

    let decoded: JwtPayload;

    try {
      decoded = this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.usersService.getUserById(decoded.id);

    if (!user) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (!user.refreshToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const isTokenValid = await argon2.verify(user.refreshToken, token);

    if (!isTokenValid) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const newAccessToken = this.generateAccessToken(user.id);
    const newRefreshToken = this.generateRefreshToken(user.id);
    logger.debug(`New refresh token generated: ${newRefreshToken}`);

    await this.usersService.updateRefreshToken(user.id, newRefreshToken);
    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }
}
