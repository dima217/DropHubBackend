import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { MailConfig } from '@config/configuration.interface';
import { SendMailDto } from '../../../dto/mailer.dto';

@Injectable()
export class MailerProvider {
  private readonly logger = new Logger(MailerProvider.name);
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    const mailerConfig = this.configService.getOrThrow<MailConfig>('mailer');

    const port = mailerConfig.port ?? 587;
    const secure = mailerConfig.secure && port === 465;
    const requireTLS = !secure && port === 587;

    const transporterConfig: nodemailer.TransportOptions = {
      host: mailerConfig.host,
      port,
      secure,
      auth: {
        user: mailerConfig.user,
        pass: mailerConfig.password,
      },
      ...(requireTLS && {
        requireTLS: true,
        tls: {
          rejectUnauthorized: false,
        },
      }),
      connectionTimeout: 60_000,
      greetingTimeout: 30_000,
      socketTimeout: 60_000,
    } as nodemailer.TransportOptions;

    this.logger.debug(
      `Mailer config: host=${mailerConfig.host}, port=${port}, secure=${secure}, requireTLS=${requireTLS}, user=${mailerConfig.user}`,
    );

    this.transporter = nodemailer.createTransport(transporterConfig);
  }

  async sendMail(dto: SendMailDto): Promise<void> {
    this.logger.debug(`Sending email to: ${dto.to}, subject: ${dto.subject}`);

    try {
      await this.transporter.sendMail({
        from: dto.from,
        to: dto.to,
        subject: dto.subject,
        html: dto.html,
        cc: dto.cc,
        bcc: dto.bcc,
        replyTo: dto.replyTo,
        attachments: dto.attachments,
        headers: dto.headers,
        envelope: dto.envelope,
      });

      this.logger.log(`Email sent successfully to: ${dto.to}`);
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${dto.to}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }
}
