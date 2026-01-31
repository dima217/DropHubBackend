import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { BullConfigModule } from "../../config/modules/bull-config.module";
import { BullModule } from "@nestjs/bullmq";
import { FileCleanUpProcessor } from "./processors/room.queue.processor";
import { FileModule } from "../../modules/file/file.module";
import { RoomCleanupService } from "./services/file-cleanup.service";
import { RoomQueueService } from "./services/room.queue.service";

@Module({
  imports: [
    BullConfigModule,
    BullModule.registerQueueAsync({
      configKey: "bull-config",
      name: "file-cleanup",
    }),
    ScheduleModule.forRoot(),
    FileModule,
  ],
  providers: [RoomQueueService, RoomCleanupService, FileCleanUpProcessor],
})
export class FileCleanAppModule {}
