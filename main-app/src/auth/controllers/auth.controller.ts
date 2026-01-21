import { Body, Controller, Get, Logger, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { LocalGuard } from '../guards/local-guard';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { RequestEmailCodeDto } from '../dto/request-email-code.dto';
import { VerifyEmailCodeDto } from '../dto/verify-email-code.dto';
import { VerificationService } from '../services/verification.service';
import type { LoginRequestUser, RefreshTokenRequest } from 'src/types/express';
import type { Request, Response } from 'express';
import { RefreshTokenGuard } from '../guards/refresh-token-guard';
import { AuthGuard } from '@nestjs/passport';
import { RegisterUserDto } from '../dto/register.dto';
import { AuthPayloadDto } from '../dto/auth.dto';
import { TokenService } from '../services/token.service';
import { PasswordService } from '../services/password.service';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly verificationService: VerificationService,
  ) {}

  @Post('login')
  @UseGuards(LocalGuard)
  async login(
    @Req() request: LoginRequestUser,
    @Body() body: AuthPayloadDto,
    @Res() response: Response,
  ) {
    const { id, profile } = request.user;
    this.logger.error(id);
    const payload = await this.authService.login(id);
    return this.authService.sendAuthResponse(request, response, { ...payload, user: { profile } });
  }

  @Post('sign-up')
  async register(
    @Body() registerDto: RegisterUserDto,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const user = await this.authService.registerUser(registerDto);
    return this.authService.sendAuthResponse(request, response, user);
  }

  @Post('new-access-token')
  @UseGuards(RefreshTokenGuard)
  async refreshToken(@Req() request: RefreshTokenRequest) {
    const { refreshToken, isBrowser } = request;

    const payload = await this.tokenService.refreshToken(refreshToken);

    if (isBrowser) {
      request.res!.cookie('refreshToken', payload.refreshToken, {
        httpOnly: true,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 1000,
      });

      return { accessToken: payload.accessToken };
    }
    return payload;
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req, @Res() res: Response) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const { refreshToken, accessToken } = await this.authService.findOrCreateUser(req.user);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    });
    res.redirect(`http://localhost:3000/auth/callback?token=${accessToken}`);
  }

  @Post('check-email')
  async checkEmail(@Body() body: { email: string }) {
    const user = await this.authService.checkEmail(body.email);
    return { exists: !!user };
  }

  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.passwordService.forgotPassword(forgotPasswordDto.email);
  }

  @Post('email/send-code')
  async sendEmailCode(@Body() dto: RequestEmailCodeDto) {
    return this.verificationService.sendEmailCode(dto.email);
  }

  @Post('email/verify-code')
  verifyCode(@Body() dto: VerifyEmailCodeDto) {
    return this.verificationService.verifyEmailCode(dto.email, dto.code);
  }
}
