import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FileController } from './file.controller';
import { FileService } from './file.service';
import { UploadService } from './services/upload/upload.service';
import { DownloadService } from './services/download/download.service';
import { MultipartUploadService } from './services/upload/multipart.upload.service';
import { PreviewService } from './services/preview/preview.service';
import { File, FileSchema } from './schemas/file.schema';
import { Room, RoomSchema } from '../room/schemas/room.schema';
import { S3Module } from '../s3/s3.module';
import { PermissionClientModule } from '../permission-client/permission-client.module';
import { TokenClientModule } from '../token-client/token-client.module';
import { StorageModule } from '../storage/storage.module';
import { RoomModule } from '../room/room.module';
import { S3ReadStream } from './utils/s3-read-stream';
import { S3WriteStream } from './utils/s3-write-stream';
import { CacheModule } from '../../cache/cache.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: File.name, schema: FileSchema },
      { name: Room.name, schema: RoomSchema },
    ]),
    S3Module,
    PermissionClientModule,
    TokenClientModule,
    StorageModule,
    RoomModule,
    CacheModule,
  ],
  controllers: [FileController],
  providers: [
    FileService,
    UploadService,
    DownloadService,
    MultipartUploadService,
    PreviewService,
    S3ReadStream,
    S3WriteStream,
  ],
  exports: [FileService, UploadService, DownloadService, MultipartUploadService, PreviewService],
})
export class FileModule {}

