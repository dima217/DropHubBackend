import { Module } from '@nestjs/common';
import { UserStorageController, PublicStorageController } from './controllers/storage.controller';
import { FileClientModule } from '../file-client/file-client.module';
import { AuthModule } from 'src/auth/auth.module';
import { PermissionModule } from '@application/permission/permission.module';

@Module({
  imports: [FileClientModule, AuthModule, PermissionModule],
  controllers: [UserStorageController, PublicStorageController],
})
export class UserStorageModule {}
