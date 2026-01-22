import { Module } from '@nestjs/common';
import { UserStorageController, PublicStorageController } from './controllers/storage.controller';
import { StorageService } from './services/storage.service';
import { FileClientModule } from '../file-client/file-client.module';
import { AuthModule } from 'src/auth/auth.module';
import { PermissionModule } from '@application/permission/permission.module';
import { UserModule } from '@application/user/user.module';

@Module({
  imports: [FileClientModule, AuthModule, PermissionModule, UserModule],
  controllers: [UserStorageController, PublicStorageController],
  providers: [StorageService],
})
export class UserStorageModule {}
