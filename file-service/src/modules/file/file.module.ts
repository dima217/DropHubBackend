import { Module, forwardRef } from '@nestjs/common';
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
import {
  FILE_SERVICE_TOKEN,
  UPLOAD_SERVICE_TOKEN,
  DOWNLOAD_SERVICE_TOKEN,
  MULTIPART_UPLOAD_SERVICE_TOKEN,
  PREVIEW_SERVICE_TOKEN,
} from './interfaces/file-service.tokens';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: File.name, schema: FileSchema },
      { name: Room.name, schema: RoomSchema },
    ]),
    S3Module,
    PermissionClientModule,
    TokenClientModule,
    forwardRef(() => StorageModule),
    RoomModule,
    CacheModule,
  ],
  controllers: [FileController],
  providers: [
    {
      provide: FILE_SERVICE_TOKEN,
      useClass: FileService,
    },
    {
      provide: UPLOAD_SERVICE_TOKEN,
      useClass: UploadService,
    },
    {
      provide: DOWNLOAD_SERVICE_TOKEN,
      useClass: DownloadService,
    },
    {
      provide: MULTIPART_UPLOAD_SERVICE_TOKEN,
      useClass: MultipartUploadService,
    },
    {
      provide: PREVIEW_SERVICE_TOKEN,
      useClass: PreviewService,
    },
    FileService,
    UploadService,
    DownloadService,
    MultipartUploadService,
    PreviewService,
    S3ReadStream,
    S3WriteStream,
  ],
  exports: [
    FILE_SERVICE_TOKEN,
    UPLOAD_SERVICE_TOKEN,
    DOWNLOAD_SERVICE_TOKEN,
    MULTIPART_UPLOAD_SERVICE_TOKEN,
    PREVIEW_SERVICE_TOKEN,
    FileService,
    UploadService,
    DownloadService,
    MultipartUploadService,
    PreviewService,
  ],
})
export class FileModule {}

