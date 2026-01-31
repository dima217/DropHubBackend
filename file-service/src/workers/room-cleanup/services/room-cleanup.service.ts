import { FileService } from "../../../modules/file/file.service";
import { Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { RoomService } from "@/modules/room/room.service";
import { RoomQueueService } from "./room.queue.service";

@Injectable()
export class RoomCleanupService {
  constructor(
    private readonly roomQueueService: RoomQueueService,
    private readonly roomService: RoomService
  ) {}

  @Cron("*/5 * * * *")
  async handleCron() {
    const expiredRooms = await this.roomService.getExpiredRooms();
    for (const room of expiredRooms) {
      this.roomQueueService.addRoomToDeleteQueue(room._id.toString());
    }
  }
}
