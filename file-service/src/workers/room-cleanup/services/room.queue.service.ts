import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { Queue } from "bullmq";

@Injectable()
export class RoomQueueService {
  constructor(@InjectQueue("room-cleanup") private readonly queue: Queue) {}

  async addRoomToDeleteQueue(roomId: string) {
    await this.queue.add("delete-room", { roomId });
  }
}
