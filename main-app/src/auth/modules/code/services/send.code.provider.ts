import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SendCodeDto } from 'src/auth/dto/mailer.dto';
import { MailerProvider } from '../provider/mailer.provider';
import { AppConfig, MailConfig } from '@config/configuration.interface';
import React from 'react';
import CodeDefaultEmail from 'src/auth/templates/code-default';
import CodeRecoveryEmail from 'src/auth/templates/code-recovery';
import CodeSignupEmail from 'src/auth/templates/code-signup';
import { ReactEmailRendererProvider } from '../provider/react-email-renderer.provider';

@Injectable()
export class SendCodeProvider {
  private readonly logger = new Logger(SendCodeProvider.name);

  constructor(
    private readonly mailerProvider: MailerProvider,
    private readonly reactEmailRenderer: ReactEmailRendererProvider,
    private readonly configService: ConfigService<AppConfig>,
  ) {}

  async sendCode(sendCodeDto: SendCodeDto): Promise<void> {
    const mailerConfig = this.configService.getOrThrow<MailConfig>('mailer');
    const expirationMinutes = Math.floor(
      (sendCodeDto.expirationDate.getTime() - new Date().getTime()) / 1000 / 60,
    );
    const expirationDate = sendCodeDto.expirationDate.toLocaleString();

    const emailComponent = this.getEmailComponent(sendCodeDto.type, {
      code: sendCodeDto.code,
      expirationMinutes,
      expirationDate,
    });
    const html = await this.reactEmailRenderer.renderEmail(emailComponent);

    this.logger.log(
      `Sending code ${sendCodeDto.code} to ${sendCodeDto.email} with type ${sendCodeDto.type}`,
    );
    await this.mailerProvider.sendMail({
      to: sendCodeDto.email,
      subject: this.getSubject(sendCodeDto.type),
      html,
      from: mailerConfig.from,
    });
    this.logger.log(
      `Code ${sendCodeDto.code} sent to ${sendCodeDto.email} with type ${sendCodeDto.type}`,
    );
  }

  private getEmailComponent(
    type: string,
    props: { code: string; expirationMinutes: number; expirationDate: string },
  ): React.ReactElement {
    const templates = {
      signup: CodeSignupEmail,
      recovery: CodeRecoveryEmail,
    };
    const EmailComponent = templates[type as keyof typeof templates] ?? CodeDefaultEmail;
    return React.createElement(EmailComponent, props);
  }

  private getSubject(type: string): string {
    const subjects = {
      signup: 'Verification Code for Sign Up',
      recovery: 'Password Recovery Code',
    };
    return subjects[type as keyof typeof subjects] ?? 'Verification Code';
  }
}
