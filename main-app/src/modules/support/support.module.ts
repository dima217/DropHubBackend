import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupportTicket } from './entities/support-ticket.entity';
import { SupportService } from './services/support.service';
import { SupportController } from './controllers/support.controller';
import { AuthModule } from 'src/auth/auth.module';
import { SupportGateway } from './gateway/support.gateway';
import { UserModule } from '@application/user/user.module';
import { PushModule } from 'src/modules/push/push.module';

@Module({
  imports: [TypeOrmModule.forFeature([SupportTicket]), AuthModule, UserModule, PushModule],
  controllers: [SupportController],
  providers: [SupportService, SupportGateway],
  exports: [SupportService],
})
export class SupportModule {}
