import { Module } from '@nestjs/common';
import { FileController } from './controllers/file.controller';
import { FileUploadController } from './controllers/file.upload.controller';
import { FileDownloadController } from './controllers/file.download.controller';
import { FileClientModule } from '../file-client/file-client.module';
import { AuthModule } from 'src/auth/auth.module';
//import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [FileClientModule, AuthModule],
  controllers: [FileController, FileUploadController, FileDownloadController],
})
export class FileModule {}
