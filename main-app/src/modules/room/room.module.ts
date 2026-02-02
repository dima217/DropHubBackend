import { Module } from '@nestjs/common';
import { RoomController } from './controllers/room.controller';
import { RoomService } from './services/room.service';
import { FileClientModule } from '../file-client/file-client.module';
import { AuthModule } from 'src/auth/auth.module';
import { PermissionModule } from '@application/permission/permission.module';
import { UserModule } from '@application/user/user.module';
import { RoomsGateway } from './gateway/room.gateway';

@Module({
  imports: [FileClientModule, AuthModule, PermissionModule, UserModule],
  controllers: [RoomController],
  providers: [RoomService, RoomsGateway],
  exports: [RoomsGateway],
})
export class RoomModule {}
