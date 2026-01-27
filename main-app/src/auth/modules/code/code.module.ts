import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Code } from './entity/code.entity';
import { CodeService } from './services/code.service';
import { VerifyCodeService } from './services/verify-code.service';
import { SendCodeProvider } from './services/send.code.provider';
import { MailerProvider } from './provider/mailer.provider';
import { ReactEmailRendererProvider } from './provider/react-email-renderer.provider';

@Module({
  imports: [TypeOrmModule.forFeature([Code])],
  providers: [
    MailerProvider,
    ReactEmailRendererProvider,
    CodeService,
    VerifyCodeService,
    SendCodeProvider,
  ],
  exports: [
    MailerProvider,
    ReactEmailRendererProvider,
    CodeService,
    VerifyCodeService,
    SendCodeProvider,
  ],
})
export class CodeModule {}
