import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AuthPayloadDto } from '../dto/auth.dto';
import { UsersService } from '../../modules/user/services/user.service';
import * as argon2 from 'argon2';
import { User, UserRole } from 'src/modules/user/entities/user.entity';
import { Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { ProfileService } from 'src/modules/user/services/profile.service';
import { TokenService } from './token.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly profileService: ProfileService,
    private readonly tokenService: TokenService,
    private readonly dataSource: DataSource,
  ) {}

  sendAuthResponse(
    req: Request,
    res: Response,
    payload: {
      accessToken: string;
      refreshToken: string;
      user?: any;
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
      });
    }

    return res.status(200).json(payload);
  }

  async validateUser(authPayloadDto: AuthPayloadDto) {
    const findUser = await this.usersService.findByEmail(authPayloadDto.email);

    if (!findUser) {
      throw new NotFoundException('User not found');
    }

    const passwordIsMatch = await argon2.verify(findUser.password, authPayloadDto.password);

    if (passwordIsMatch) {
      return { id: findUser.id, profile: findUser.profile, role: UserRole.USER };
    } else {
      throw new NotFoundException('Incorrect credentials');
    }
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
    password: string;
    firstName: string;
    lastName: string;
  }) {
    const userData = {
      ...dto,
      password: dto.password,
      role: UserRole.USER,
      isOAuthUser: false,
    };

    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) throw new BadRequestException('User already exists');

    const user = await this.createUserWithProfile(userData);

    const accessToken = this.tokenService.generateAccessToken(user.id);
    const refreshToken = this.tokenService.generateRefreshToken(user.id);
    await this.usersService.updateRefreshToken(user.id, refreshToken);

    return {
      accessToken,
      refreshToken,
    };
  }

  async findOrCreateUser(dto: {
    email: string;
    firstName: string;
    lastName: string;
    picture?: string;
  }) {
    const userData = {
      ...dto,
      role: UserRole.USER,
      isOAuthUser: true,
    };
    const user = await this.createUserWithProfile(userData);

    const accessToken = this.tokenService.generateAccessToken(user.id);
    const refreshToken = this.tokenService.generateRefreshToken(user.id);
    await this.usersService.updateRefreshToken(user.id, refreshToken);

    return {
      accessToken,
      refreshToken,
    };
  }

  private async createUserWithProfile(params: {
    email: string;
    password?: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    isOAuthUser: boolean;
  }): Promise<User> {
    return this.dataSource.transaction(async (manager) => {
      const profile = await this.profileService.createProfileTransactional(
        {
          firstName: params.firstName,
          lastName: params.lastName,
          avatarUrl: null,
        },
        manager,
      );

      const user = await this.usersService.createUserTransactional(
        {
          email: params.email,
          password: params.password ? await argon2.hash(params.password) : undefined,
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
