import { Module } from '@nestjs/common';
import { PermissionModule } from '@application/permission/permission.module';
import { UserModule } from '@application/user/user.module';
import { FcmTokenModule } from './fcm-token.module';
import { FcmService } from './fcm.service';
import { PushEventsService } from './push-events.service';

@Module({
  imports: [FcmTokenModule, PermissionModule, UserModule],
  providers: [FcmService, PushEventsService],
  exports: [FcmService, FcmTokenModule, PushEventsService],
})
export class PushModule {}
