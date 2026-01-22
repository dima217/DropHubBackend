import { Module } from '@nestjs/common';
import { SearchService } from './services/search.service';
import { SearchController } from './controllers/search.controller';
import { PermissionModule } from '../permission/permission.module';
import { FileClientModule } from '../file-client/file-client.module';

@Module({
  imports: [PermissionModule, FileClientModule],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}

