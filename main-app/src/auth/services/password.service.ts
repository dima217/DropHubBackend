import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../../modules/user/services/user.service';
import * as argon2 from 'argon2';
import { VerifyCodeService } from '../modules/code/services/verify-code.service';
import { Code } from '../modules/code/entity/code.entity';

@Injectable()
export class PasswordService {
  constructor(
    private readonly usersService: UsersService,
    private readonly verifyCodeService: VerifyCodeService,
  ) {}

  async changePassword(userId: number, oldPassword: string, newPassword: string) {
    const user = await this.usersService.getUserById(userId);
    if (!user) {
      throw new NotFoundException('User not found...');
    }
    const passwordMatch = await argon2.verify(oldPassword, newPassword);
    if (!passwordMatch) {
      throw new UnauthorizedException('Wrong credentials');
    }
    await this.usersService.updatePassword(userId, newPassword);
  }

  async resetPassword(userId: number, newPassword: string, resetToken: string) {
    const user = await this.usersService.getUserById(userId);
    if (!user) {
      throw new NotFoundException('User not found...');
    }

    if (!user.resetPasswordToken || resetToken !== user.resetPasswordToken) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (user.tokenExpiredDate && user.tokenExpiredDate < new Date()) {
      throw new UnauthorizedException('Reset token expired');
    }

    await this.usersService.updatePassword(user.id, newPassword);

    await this.usersService.updateUserToken(user.id, {
      resetPasswordToken: null,
      tokenExpiredDate: null,
    });
  }

  async resetPasswordByCode(email: string, code: string, newPassword: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found...');
    }

    const isValid = await this.verifyCodeService.verifyCode(email, code, Code.Types.recovery);
    if (!isValid) {
      throw new UnauthorizedException('Invalid or expired code');
    }

    await this.usersService.updatePassword(user.id, newPassword);
  }
}
