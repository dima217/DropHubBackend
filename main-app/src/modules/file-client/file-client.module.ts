import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { FileClientService } from './services/file-client.service';
import { StorageClientService } from './services/storage-client.service';
import { RoomClientService } from './services/room-client.service';
import { AvatarClientService } from './services/auth/avatar-client.service';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'FILE_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
          queue: 'file_service_queue',
          queueOptions: {
            durable: true,
          },
        },
      },
    ]),
  ],
  providers: [FileClientService, StorageClientService, RoomClientService, AvatarClientService],
  exports: [FileClientService, StorageClientService, RoomClientService, AvatarClientService],
})
export class FileClientModule {}
