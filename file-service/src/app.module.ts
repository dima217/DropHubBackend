import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FileModule } from './modules/file/file.module';
import { StorageModule } from './modules/storage/storage.module';
import { RoomModule } from './modules/room/room.module';
import { S3Module } from './modules/s3/s3.module';
import { PermissionClientModule } from './modules/permission-client/permission-client.module';
import { TokenClientModule } from './modules/token-client/token-client.module';
import { MongoConfigModule } from './config/modules/mongo-config.module';
import { configuration } from './config/configuration';
import { CacheModule } from './cache/cache.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],  
      //envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`, '.env'],
    }),
    MongoConfigModule,
    CacheModule,
    PermissionClientModule,
    TokenClientModule,
    S3Module,
    FileModule,
    StorageModule,
    RoomModule,
  ],
})
export class AppModule {}
