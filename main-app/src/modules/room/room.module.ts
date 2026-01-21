import { Module } from '@nestjs/common';
import { RoomController } from './controllers/room.controller';
import { FileClientModule } from '../file-client/file-client.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [FileClientModule, AuthModule],
  controllers: [RoomController],
})
export class RoomModule {}
