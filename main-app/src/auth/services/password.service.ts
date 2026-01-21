import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../../modules/user/services/user.service';
import * as argon2 from 'argon2';
import { MailService } from './mail.service';
import { generateToken } from '../common/additional.functions';

@Injectable()
export class PasswordService {
  constructor(
    private readonly usersService: UsersService,
    private mailService: MailService,
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

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return { message: 'If this user exists, they will receive an email!' };
    }

    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 1);

    const resetToken = generateToken(32);

    await this.usersService.updateUserToken(user.id, {
      resetPasswordToken: null,
      tokenExpiredDate: null,
    });

    await this.usersService.updateUserToken(user.id, {
      resetPasswordToken: resetToken,
      tokenExpiredDate: expiryDate,
    });

    await this.mailService.sendPasswordResetEmail(email, user.id, resetToken);

    return { message: 'If this user exists, they will receive an email' };
  }
}
