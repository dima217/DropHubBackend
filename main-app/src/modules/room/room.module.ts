import { Module } from '@nestjs/common';
import { RoomController } from './controllers/room.controller';
import { FileClientModule } from '../file-client/file-client.module';
import { AuthModule } from 'src/auth/auth.module';
import { PermissionModule } from '@application/permission/permission.module';

@Module({
  imports: [FileClientModule, AuthModule, PermissionModule],
  controllers: [RoomController],
})
export class RoomModule {}
