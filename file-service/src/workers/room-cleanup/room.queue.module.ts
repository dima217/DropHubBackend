import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { BullConfigModule } from "../../config/modules/bull-config.module";
import { BullModule } from "@nestjs/bullmq";
import { FileCleanUpProcessor } from "./processors/room.queue.processor";
import { RoomCleanupService } from "./services/room-cleanup.service";
import { RoomQueueService } from "./services/room.queue.service";
import { RoomModule } from "@/modules/room/room.module";

@Module({
  imports: [
    BullConfigModule,
    BullModule.registerQueueAsync({
      configKey: "bull-config",
      name: "file-cleanup",
    }),
    ScheduleModule.forRoot(),
    RoomModule,
  ],
  providers: [RoomQueueService, RoomCleanupService, FileCleanUpProcessor],
})
export class FileCleanAppModule {}
