import { Module, forwardRef } from '@nestjs/common';
import { UserModule } from 'src/modules/user/user.module';
import { AuthService } from './services/auth.service';
import { AuthController } from './controllers/auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { LocalStrategy } from './strategies/local-strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt-strategy';
import { RolesGuard } from './guards/roles-guard';
import { MailService } from './services/mail.service';
import { VerificationService } from './services/verification.service';
import { TokenService } from './services/token.service';
import { PasswordService } from './services/password.service';
import { WsJwtAuthGuard } from './guards/ws-jwt-auth.guard';
import { JwtAuthGuard } from './guards/jwt-guard';
import { RefreshTokenGuard } from './guards/refresh-token-guard';
import { FileClientModule } from '@application/file-client';

@Module({
  imports: [
    forwardRef(() => UserModule),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: '25sec' },
      }),
      inject: [ConfigService],
    }),
    FileClientModule,
  ],
  providers: [
    AuthService,
    VerificationService,
    MailService,
    LocalStrategy,
    JwtStrategy,
    RolesGuard,
    TokenService,
    PasswordService,
    WsJwtAuthGuard,
    JwtAuthGuard,
    RefreshTokenGuard,
  ],
  exports: [WsJwtAuthGuard, JwtModule, JwtAuthGuard, RefreshTokenGuard],
  controllers: [AuthController],
})
export class AuthModule {}
