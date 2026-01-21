import { Module } from '@nestjs/common';
import { FileQueueService } from './services/file.queue.service';
import { ScheduleModule } from '@nestjs/schedule';
import { BullConfigModule } from '../../config/modules/bull-config.module';
import { BullModule } from '@nestjs/bullmq';
import { FileCleanupService } from './services/file-cleanup.service';
import { FileCleanUpProcessor } from './processors/file.queue.processor';
import { FileModule } from '../../modules/file/file.module';

@Module({
  imports: [
    BullConfigModule,
    BullModule.registerQueueAsync({
      configKey: 'bull-config',
      name: 'file-cleanup',
    }),
    ScheduleModule.forRoot(),
    FileModule,
  ],
  providers: [FileQueueService, FileCleanupService, FileCleanUpProcessor],
})
export class FileCleanAppModule {}

