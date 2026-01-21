import { Injectable } from '@nestjs/common';
import { MailService } from './mail.service';

@Injectable()
export class VerificationService {
  constructor(private readonly mailService: MailService) {}

  async sendEmailCode(email: string, code?: string) {
    const verificationCode = code || this.generateCode();

    const html = `
      <p style="font-size: 16px;">
        Your verification code is: <strong>${verificationCode}</strong>
      </p>
      <p style="color: #888; font-size: 12px;">
        This code is valid for 10 minutes.
      </p>
    `;

    await this.mailService.sendRawHtml(email, 'Email Verification Code', html);

    return verificationCode;
  }

  verifyEmailCode(providedCode: string, actualCode: string): boolean {
    return providedCode === actualCode;
  }

  private generateCode(): string {
    return Array.from({ length: 8 }, () => Math.floor(Math.random() * 10)).join('');
  }
}
