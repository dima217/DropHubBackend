import { Module } from '@nestjs/common';
import { RoomController } from './controllers/room.controller';
import { RoomService } from './services/room.service';
import { FileClientModule } from '../file-client/file-client.module';
import { AuthModule } from 'src/auth/auth.module';
import { PermissionModule } from '@application/permission/permission.module';
import { UserModule } from '@application/user/user.module';

@Module({
  imports: [FileClientModule, AuthModule, PermissionModule, UserModule],
  controllers: [RoomController],
  providers: [RoomService],
})
export class RoomModule {}
