import {
  Body,
  ConflictException,
  Controller,
  Get,
  Logger,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import { LocalGuard } from '../guards/local-guard';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { RequestEmailCodeDto } from '../dto/request-email-code.dto';
import { VerifyEmailCodeDto } from '../dto/verify-email-code.dto';
import type { LoginRequestUser, RefreshTokenRequest } from 'src/types/express';
import type { Request, Response } from 'express';
import { RefreshTokenGuard } from '../guards/refresh-token-guard';
import { AuthGuard } from '@nestjs/passport';
import { RegisterUserDto } from '../dto/register.dto';
import { AuthPayloadDto } from '../dto/auth.dto';
import { TokenService } from '../services/token.service';
import { PasswordService } from '../services/password.service';
import { SendCodeProvider } from '../modules/code/services/send.code.provider';
import { VerifyCodeService } from '../modules/code/services/verify-code.service';
import { Code } from '../modules/code/entity/code.entity';
import { ResetPasswordByCodeDto } from '../dto/reset-password-by-code.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly codeService: VerifyCodeService,
    private readonly sendCodeProvider: SendCodeProvider,
  ) {}

  @Post('login')
  @UseGuards(LocalGuard)
  @ApiOperation({
    summary: 'User login',
    description:
      'Authenticates a user with email and password. Returns access token and refresh token in cookies and response body.',
  })
  @ApiBody({ type: AuthPayloadDto })
  @ApiResponse({
    status: 200,
    description:
      'Login successful. Returns access token and user profile. Refresh token is set in HTTP-only cookie.',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
        refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
        user: {
          type: 'object',
          properties: {
            profile: { type: 'object' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
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

  @Post('sign-up-init')
  async signUpInit(@Body() signUpInitDto: RequestEmailCodeDto) {
    const existUser = await this.authService.userExist(signUpInitDto);
    if (!existUser) {
      const code = await this.codeService.generateCode(signUpInitDto.email, Code.Types.signup);
      this.sendCodeProvider
        .sendCode({
          email: signUpInitDto.email,
          code: code.code,
          type: code.type,
          expirationDate: code.expirationDate,
        })
        .catch((error) => {
          this.logger.error(
            `Failed to send signup code to ${signUpInitDto.email}: ${error instanceof Error ? error.message : String(error)}`,
          );
        });
    } else {
      throw new ConflictException('User with this email already exists');
    }
  }

  @Post('sign-up-verify-code')
  @ApiOperation({
    summary: 'Verify sign-up email code',
    description: 'Verifies the 6-digit verification code sent during sign-up initialization.',
  })
  @ApiBody({ type: VerifyEmailCodeDto })
  @ApiResponse({
    status: 200,
    description: 'Sign-up email code verified successfully',
    schema: {
      type: 'object',
      properties: {
        verified: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired verification code' })
  async verifySignUpCode(@Body() dto: VerifyEmailCodeDto) {
    const isValid = await this.codeService.verifyCode(dto.email, dto.code, Code.Types.signup);
    if (!isValid) {
      return { verified: false };
    }

    return { verified: true };
  }

  @Post('sign-up')
  @ApiOperation({
    summary: 'User registration',
    description:
      'Registers a new user account. Password is optional if using OAuth. Returns access token and refresh token.',
  })
  @ApiBody({ type: RegisterUserDto })
  @ApiResponse({
    status: 201,
    description:
      'User registered successfully. Returns access token and refresh token in cookies and response body.',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
        refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
        user: { type: 'object' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - email already exists or invalid data' })
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
  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Generates a new access token using a valid refresh token. Refresh token can be provided in cookie or Authorization header.',
  })
  @ApiResponse({
    status: 200,
    description:
      'New access token generated successfully. For browser requests, only accessToken is returned. For API requests, both tokens are returned.',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
        refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
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
  @ApiOperation({
    summary: 'Initiate Google OAuth',
    description: 'Redirects user to Google OAuth consent screen for authentication.',
  })
  @ApiResponse({ status: 302, description: 'Redirects to Google OAuth' })
  async googleAuth() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({
    summary: 'Google OAuth callback',
    description:
      'Handles Google OAuth callback. Creates or finds user and redirects to frontend with access token.',
  })
  @ApiResponse({ status: 302, description: 'Redirects to frontend callback URL with access token' })
  @ApiResponse({ status: 401, description: 'OAuth authentication failed' })
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
  @ApiOperation({
    summary: 'Check if email exists',
    description: 'Checks if an email address is already registered in the system.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email', example: 'user@example.com' },
      },
      required: ['email'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Email check completed',
    schema: {
      type: 'object',
      properties: {
        exists: { type: 'boolean', example: true },
      },
    },
  })
  async checkEmail(@Body() body: { email: string }) {
    const user = await this.authService.checkEmail(body.email);
    return { exists: !!user };
  }

  @Post('forgot-password')
  @ApiOperation({
    summary: 'Request password reset',
    description: 'Sends a password reset email to the user if the email exists in the system.',
  })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset email sent (if email exists)',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Password reset email sent' },
      },
    },
  })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    const code = await this.codeService.generateCode(forgotPasswordDto.email, Code.Types.recovery);

    this.sendCodeProvider
      .sendCode({
        email: forgotPasswordDto.email,
        code: code.code,
        type: code.type,
        expirationDate: code.expirationDate,
      })
      .catch((error) => {
        this.logger.error(
          `Failed to send recovery code to ${forgotPasswordDto.email}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      });

    return { message: 'If this user exists, they will receive an email' };
  }

  @Post('forgot-password/verify-code')
  @ApiOperation({
    summary: 'Verify password recovery code',
    description: 'Verifies the 6-digit recovery code sent to the user email.',
  })
  @ApiBody({ type: VerifyEmailCodeDto })
  @ApiResponse({
    status: 200,
    description: 'Recovery code verified',
    schema: {
      type: 'object',
      properties: {
        verified: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired recovery code' })
  async verifyForgotPasswordCode(@Body() dto: VerifyEmailCodeDto) {
    const isValid = await this.codeService.verifyCode(dto.email, dto.code, Code.Types.recovery);
    if (!isValid) {
      return { verified: false };
    }

    return { verified: true };
  }

  @Post('forgot-password/reset')
  @ApiOperation({
    summary: 'Reset password using verification code',
    description: 'Resets user password using a valid 6-digit recovery code sent to email.',
  })
  @ApiBody({ type: ResetPasswordByCodeDto })
  @ApiResponse({
    status: 200,
    description: 'Password has been reset successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired recovery code' })
  async resetPasswordByCode(@Body() dto: ResetPasswordByCodeDto) {
    await this.passwordService.resetPasswordByCode(dto.email, dto.code, dto.newPassword);

    return { success: true };
  }
}
