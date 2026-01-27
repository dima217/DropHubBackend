import { CodeType } from '../modules/code/entity/code.entity';

export class SendMailDto {
  to: string;
  subject: string;
  html: string;
  attachments?: {
    filename: string;
    content: string;
  }[];
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  from?: string;
  headers?: Record<string, string>;
  envelope?: {
    from: string;
    to: string[];
  };
}

export class SendCodeDto {
  email: string;
  code: string;
  type: CodeType;
  expirationDate: Date;
}
