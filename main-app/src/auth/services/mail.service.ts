/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface EmailOptions {
  to: string;
  subject: string;
  htmlContent: string;
}

@Injectable()
export class MailService {
  private sendGridApiKey: string;
  private fromEmail: string;
  private baseUrl: string;

  constructor(private configService: ConfigService) {
    const baseUrl = this.configService.get<string>('BASE_URL');
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY');
    const from = this.configService.get<string>('SENDGRID_FROM');

    if (!apiKey) throw new Error('SENDGRID_API_KEY is not defined');
    if (!baseUrl) throw new Error('SENDGRID_API_KEY is not defined');
    if (!from) throw new Error('SENDGRID_FROM is not defined');

    this.sendGridApiKey = apiKey;
    this.fromEmail = from;
    this.baseUrl = baseUrl;
  }

  private async sendEmail({ to, subject, htmlContent }: EmailOptions) {
    const url = 'https://api.sendgrid.com/v3/mail/send';

    const msg = {
      personalizations: [{ to: [{ email: to }], subject }],
      from: { email: this.fromEmail },
      content: [{ type: 'text/html', value: htmlContent }],
    };

    try {
      const response = await axios.post(url, msg, {
        headers: {
          Authorization: `Bearer ${this.sendGridApiKey}`,
          'Content-Type': 'application/json',
        },
      });
      console.log('Email sent successfully:', response.data);
    } catch (error: any) {
      console.error('Error sending email:', error.response?.data || error.message);
      throw new Error('Failed to send email');
    }
  }

  async sendPasswordResetEmail(email: string, userId: number, token: string) {
    const resetLink = `${this.baseUrl}/auth/reset-password?userId=${userId}&resetToken=${token}`;
    const htmlContent = this.buildResetPasswordEmail(resetLink);

    await this.sendEmail({
      to: email,
      subject: 'Reset your password',
      htmlContent,
    });
  }

  private buildResetPasswordEmail(resetLink: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ccc; border-radius: 8px; background-color: #f9f9f9;">
        <h2 style="text-align: center; color: #333;">Reset Your Password</h2>
        <p style="font-size: 16px; color: #333;">
          You requested a password reset. Click the button below to reset your password:
        </p>
        <p style="text-align: center;">
          <a href="${resetLink}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; font-size: 16px;">
            Reset Password
          </a>
        </p>
        <p style="font-size: 12px; color: #777; text-align: center; margin-top: 20px;">
          If you did not request a password reset, please ignore this email.
        </p>
      </div>
    `;
  }

  async sendRawHtml(email: string, subject: string, htmlContent: string) {
    await this.sendEmail({ to: email, subject, htmlContent });
  }
}
