import { Module } from '@nestjs/common';
import { UserStorageController } from './controllers/storage.controller';
import { PublicStorageController } from './controllers/public-storage.controller';
import { StorageAdminController } from './controllers/storage-admin.controller';
import { StorageSharedController } from './controllers/storage-shared.controller';
import { StorageService } from './services/storage.service';
import { FileClientModule } from '../file-client/file-client.module';
import { AuthModule } from 'src/auth/auth.module';
import { PermissionModule } from '@application/permission/permission.module';
import { UserModule } from '@application/user/user.module';
import { SharedService } from './services/shared.service';
import { PushModule } from '../push/push.module';

@Module({
  imports: [FileClientModule, AuthModule, PermissionModule, UserModule, PushModule],
  controllers: [
    UserStorageController,
    StorageSharedController,
    StorageAdminController,
    PublicStorageController,
  ],
  providers: [StorageService, SharedService],
})
export class UserStorageModule {}
