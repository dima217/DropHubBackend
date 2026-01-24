import { Module } from '@nestjs/common';
import { FileController } from './controllers/file.controller';
import { FileUploadController } from './controllers/file.upload.controller';
import { FileDownloadController } from './controllers/file.download.controller';
import { FilePreviewController } from './controllers/file.preview.controller';
import { FileClientModule } from '../file-client/file-client.module';
import { AuthModule } from 'src/auth/auth.module';
import { PermissionModule } from '@application/permission/permission.module';

@Module({
  imports: [FileClientModule, AuthModule, PermissionModule],
  controllers: [
    FileController,
    FileUploadController,
    FileDownloadController,
    FilePreviewController,
  ],
})
export class FileModule {}
