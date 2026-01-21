import { FileService } from '../../../modules/file/file.service';
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { FileQueueService } from './file.queue.service';

@Injectable()
export class FileCleanupService {
  constructor(
    private readonly fileQueueService: FileQueueService,
    private readonly fileService: FileService,
  ) {}

  @Cron('*/5 * * * *')
  async handleCron() {
    const expiredFiles = await this.fileService.getExpiredFiles();
    for (const file of expiredFiles) {
      this.fileQueueService.addFileToDeleteQueue(file.storedName);
    }
  }
}
