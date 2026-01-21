import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configuration } from './config/configuration';
import { UserModule } from './modules/user/user.module';
import { BullConfigModule } from './config/modules/bull-config.module';
import { DatabaseModule } from './config/modules/database.module';
import { AppConfig } from './config/configuration.interface';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PermissionModule } from '@application/permission/permission.module';
import { RelationshipsModule } from '@application/relationships/relationships.module';
import { FileModule } from '@application/file/files.module';
import { UserStorageModule } from '@application/storage/user_storage.module';
import { RoomModule } from '@application/room/room.module';

@Module({
  imports: [
    ConfigModule.forRoot<AppConfig>({
      load: [configuration],
      isGlobal: true,
      //envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`, '.env'],
    }),

    DatabaseModule,
    BullConfigModule,

    AuthModule,
    FileModule,
    UserStorageModule,
    RoomModule,
    UserModule,
    RelationshipsModule,
    PermissionModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
