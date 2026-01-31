import { RoomService } from "@/modules/room/room.service";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";

@Processor("room-cleanup")
export class FileCleanUpProcessor extends WorkerHost {
  constructor(private readonly roomService: RoomService) {
    super();
  }

  async process(job: Job<{ roomId: string }>): Promise<void> {
    const { roomId } = job.data;

    try {
      await this.roomService.deleteRoomWithFiles(roomId);
      console.log(`Room cleanup completed: ${roomId}`);
    } catch (err) {
      console.error(`Error deleting room: ${roomId}`, err);
      throw err;
    }
  }
}
