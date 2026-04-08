import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { StorageService } from "./storage/storage.service";

@Injectable()
export class StorageSoftDeleteCleanupService {
  private readonly logger = new Logger(StorageSoftDeleteCleanupService.name);

  constructor(private readonly storageService: StorageService) {}

  @Cron("0 4 * * *")
  async purgeStorageSoftDeleted(): Promise<void> {
    const result = await this.storageService.purgeStorageItemsPermanently();
    if (result.purgedItems > 0) {
      this.logger.log(
        `Purged storage soft-deleted items: roots=${result.purgedRoots}, items=${result.purgedItems}, files=${result.purgedFiles}`
      );
    }
  }
}
