import { FileService } from '../../../modules/file/file.service';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

@Processor('file-cleanup')
export class FileCleanUpProcessor extends WorkerHost {
  constructor(private readonly fileService: FileService) {
    super();
  }

  async process(job: Job<{ storedName: string }>): Promise<void> {
    const { storedName } = job.data;

    try {
      await this.fileService.deleteFileCompletely(storedName);
      console.log(`File cleanup completed: ${storedName}`);
    } catch (err) {
      console.error(`Error deleting file: ${storedName}`, err);
      throw err;
    }
  }
}
