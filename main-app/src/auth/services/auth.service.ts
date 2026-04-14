import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AuthPayloadDto } from '../dto/auth.dto';
import { UsersService } from '../../modules/user/services/user.service';
import * as argon2 from 'argon2';
import { User, UserRole } from 'src/modules/user/entities/user.entity';
import { Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { ProfileService } from 'src/modules/user/services/profile.service';
import { TokenService } from './token.service';
import { AvatarClientService } from '@application/file-client/services/auth/avatar-client.service';
import { RequestEmailCodeDto } from '../dto/request-email-code.dto';
import { GoogleIdTokenService } from './google-id-token.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly profileService: ProfileService,
    private readonly tokenService: TokenService,
    private readonly avatarService: AvatarClientService,
    private readonly dataSource: DataSource,
    private readonly googleIdTokenService: GoogleIdTokenService,
  ) {}

  sendAuthResponse(
    req: Request,
    res: Response,
    payload: {
      accessToken: string;
      refreshToken: string;
      avatarUrl?: any;
      avatarKey?: any;
      publicUrl?: any;
      user?: any;
      uploadUrl?: any;
      existing?: boolean;
    },
  ) {
    const isMobileApp = req.headers['x-client-type'] === 'mobile-app';
    const isBrowser = !isMobileApp;

    if (isBrowser) {
      res.cookie('refreshToken', payload.refreshToken, {
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.status(200).json({
        accessToken: payload.accessToken,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        user: payload.user,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        avatarUrl: payload.avatarUrl,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        avatarKey: payload.avatarKey,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        publicUrl: payload.publicUrl,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        uploadUrl: payload.uploadUrl,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        existing: payload.existing,
      });
    }

    return res.status(200).json(payload);
  }

  async validateUser(authPayloadDto: AuthPayloadDto) {
    const findUser = await this.usersService.findByEmail(authPayloadDto.email);

    if (!findUser) {
      throw new NotFoundException('User not found');
    }

    if (findUser.isOAuthUser || !findUser.password) {
      return null;
    }

    const passwordIsMatch = await argon2.verify(findUser.password, authPayloadDto.password);

    if (passwordIsMatch) {
      return { id: findUser.id, profile: findUser.profile, role: UserRole.USER };
    } else {
      throw new NotFoundException('Incorrect credentials');
    }
  }

  async userExist(authPayloadDto: RequestEmailCodeDto) {
    const findUser = await this.usersService.findByEmail(authPayloadDto.email);
    return findUser;
  }

  async login(userId: number) {
    const accessToken = this.tokenService.generateAccessToken(userId);
    const refreshToken = this.tokenService.generateRefreshToken(userId);

    await this.usersService.updateRefreshToken(userId, refreshToken);

    return {
      accessToken,
      refreshToken,
    };
  }

  async registerUser(dto: {
    email: string;
    password?: string;
    firstName: string;
    customAvatarNumber?: number;
  }) {
    if (!dto.password?.trim()) {
      throw new BadRequestException('Password is required for email registration');
    }

    const userData = {
      ...dto,
      password: dto.password,
      role: UserRole.USER,
      isOAuthUser: false,
    };

    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) throw new BadRequestException('User already exists');

    const existingUserByFirstName = await this.profileService.findByFirstName(dto.firstName);
    if (existingUserByFirstName) {
      throw new BadRequestException('Username already taken');
    }

    const user = await this.createUserWithProfile(userData);

    let avatarUrl: string | null = null;
    let uploadUrl: string | null = null;
    let avatarKey: string | null = null;
    let publicDownloadUrl: string | null = null;

    if (dto.customAvatarNumber) {
      try {
        const { url } = await this.avatarService.getDefaultAvatar(dto.customAvatarNumber);
        avatarUrl = url;
        this.logger.debug(
          `getDefaultAvatar response`,
          JSON.stringify({
            url: url,
            customAvatarNumber: dto.customAvatarNumber,
          }),
        );
      } catch (error) {
        if (error instanceof BadRequestException) {
          throw new BadRequestException('Invalid default avatar number');
        }
      }
    } else {
      const { url, key, publicUrl } = await this.avatarService.getUploadUrl({
        userId: user.id.toString(),
        contentType: 'image/png',
      });
      uploadUrl = url;
      avatarKey = key;
      publicDownloadUrl = publicUrl;
    }
    const accessToken = this.tokenService.generateAccessToken(user.id);
    const refreshToken = this.tokenService.generateRefreshToken(user.id);
    await this.usersService.updateRefreshToken(user.id, refreshToken);

    this.logger.debug(
      `Register response`,
      JSON.stringify({
        userId: user.id,
        avatarUrl,
        publicDownloadUrl,
        avatarKey,
      }),
    );

    return {
      accessToken,
      refreshToken,
      avatarUrl: avatarUrl,
      avatarKey: avatarKey,
      uploadUrl: uploadUrl,
      publicUrl: publicDownloadUrl,
    };
  }

  /** Native mobile: verify Google ID token, then same user pipeline as web OAuth (no Google tokens stored). */
  async signInWithGoogleIdToken(idToken: string): Promise<{
    id: number;
    profile: User['profile'];
    role: UserRole;
    existing: boolean;
  }> {
    const google = await this.googleIdTokenService.verifyAndExtractProfile(idToken);
    return this.validateGoogleProfile({
      email: google.email,
      firstName: google.firstName,
      avatarUrl: google.avatarUrl,
    });
  }

  /**
   * Google OAuth: finds user by email or creates one. Does not persist Google tokens.
   * JWT/refresh are issued in AuthController after this (via login()).
   */
  async validateGoogleProfile(payload: {
    email: string;
    firstName: string;
    avatarUrl?: string | null;
  }): Promise<{ id: number; profile: User['profile']; role: UserRole; existing: boolean }> {
    const email = payload.email?.trim().toLowerCase();
    if (!email) {
      throw new BadRequestException('Google account has no email');
    }

    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      if (existing.isBanned) {
        throw new ForbiddenException('Account is banned');
      }
      if (existing.isOAuthUser && payload.avatarUrl && existing.profile?.id) {
        await this.profileService.updateProfile(existing.profile.id, {
          avatarUrl: payload.avatarUrl,
        });
        existing.profile.avatarUrl = payload.avatarUrl;
      }
      return {
        id: existing.id,
        profile: existing.profile,
        role: existing.role,
        existing: true,
      };
    }

    const firstName = await this.pickUniqueDisplayName(payload.firstName, email);
    const user = await this.createUserWithProfile({
      email,
      firstName,
      role: UserRole.USER,
      isOAuthUser: true,
      avatarUrl: payload.avatarUrl ?? null,
    });

    const full = await this.usersService.getUserById(user.id);
    if (!full?.profile) {
      throw new BadRequestException('Failed to load user profile after Google sign-in');
    }

    return {
      id: full.id,
      profile: full.profile,
      role: full.role,
      existing: false,
    };
  }

  private async pickUniqueDisplayName(base: string, email: string): Promise<string> {
    const fromEmail = email.split('@')[0] || 'user';
    let candidate = (base?.trim() || fromEmail).slice(0, 255) || 'user';
    let n = 0;
    while (await this.profileService.findByFirstName(candidate)) {
      n += 1;
      candidate = `${base?.trim() || fromEmail}_${n}`.slice(0, 255);
    }
    return candidate;
  }

  private async createUserWithProfile(params: {
    email: string;
    password?: string;
    firstName: string;
    role: UserRole;
    avatarUrl?: string | null;
    isOAuthUser: boolean;
  }): Promise<User> {
    return this.dataSource.transaction(async (manager) => {
      const profile = await this.profileService.createProfileTransactional(
        {
          firstName: params.firstName,
          avatarUrl: params.avatarUrl ?? null,
        },
        manager,
      );

      const passwordValue = params.password ? await argon2.hash(params.password) : null;

      const user = await this.usersService.createUserTransactional(
        {
          email: params.email,
          password: passwordValue,
          role: params.role,
          isOAuthUser: params.isOAuthUser,
          profile,
        },
        manager,
      );

      profile.user = user;
      await manager.save(profile);
      return user;
    });
  }

  async checkEmail(email: string) {
    const emailMod = email?.trim();

    if (!emailMod) {
      return { exists: false, message: 'Invalid email' };
    }
    return this.usersService.findByEmail(email);
  }
}
