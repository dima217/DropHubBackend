import { forwardRef, Module } from '@nestjs/common';
import { UsersService } from './services/user.service';
import { UserController } from './controllers/user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Profile } from './entities/profile.entity';
import { ProfileService } from './services/profile.service';
import { AuthModule } from 'src/auth/auth.module';
import { FileClientModule } from '../file-client/file-client.module';
import { ProfileController } from './controllers/profile.controller';
import { ActionLog } from './entities/action-log.entity';
import { ActionLogService } from './services/action-log.service';
import { AdminStatisticsService } from './services/admin-statistics.service';
import { PermissionModule } from '@application/permission/permission.module';
import { FcmTokenModule } from '@application/push/fcm-token.module';
import { Notification } from './entities/notification.entity';
import { NotificationService } from './services/notification.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Profile, ActionLog, Notification]),
    forwardRef(() => AuthModule),
    FileClientModule,
    forwardRef(() => PermissionModule),
    FcmTokenModule,
  ],
  controllers: [UserController, ProfileController],
  providers: [
    UsersService,
    ProfileService,
    ActionLogService,
    AdminStatisticsService,
    NotificationService,
  ],
  exports: [
    UsersService,
    ProfileService,
    ActionLogService,
    AdminStatisticsService,
    NotificationService,
  ],
})
export class UserModule {}
