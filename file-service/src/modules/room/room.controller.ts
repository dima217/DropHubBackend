import { Controller, Inject } from "@nestjs/common";
import { EventPattern, MessagePattern, Payload } from "@nestjs/microservices";
import type { IRoomService } from "./interfaces";
import { ROOM_SERVICE_TOKEN } from "./interfaces";
import { UpdateRoomDto } from "./dto/update-room.dto";
import { ArchiveRoomService } from "./services/archive-room.service";

@Controller()
export class RoomController {
  constructor(
    @Inject(ROOM_SERVICE_TOKEN) private readonly roomService: IRoomService,
    private readonly archiveRoomService: ArchiveRoomService
  ) {}

  @MessagePattern("room.create")
  async createRoom(
    @Payload() data: { userId: number; username?: string; expiresAt: string }
  ) {
    return this.roomService.createRoom(data);
  }

  @MessagePattern("room.getByUserId")
  async getRoomsByUserId(@Payload() data: { userId: number }) {
    return this.roomService.getRoomsByUserID(data.userId);
  }

  @MessagePattern("room.bindFile")
  async bindFile(@Payload() data: { roomId: string; fileId: string }) {
    return this.roomService.bindFileToRoom(data.roomId, data.fileId);
  }

  @MessagePattern("room.update")
  async update(@Payload() data: UpdateRoomDto) {
    return this.roomService.updateRoom(data);
  }

  @MessagePattern("room.delete")
  async deleteRoom(@Payload() data: { roomId: string; userId: number }) {
    return this.roomService.deleteRoom(data);
  }

  @MessagePattern("room.getById")
  async getRoomById(@Payload() data: { roomId: string }) {
    return this.roomService.getRoomById(data.roomId);
  }

  @MessagePattern("room.getDetailsById")
  async getRoomsDetailsById(@Payload() data: { roomId: string }) {
    return this.roomService.getRoomDetailsById(data.roomId);
  }

  @MessagePattern("room.getByIds")
  async getRoomsByIds(@Payload() data: { roomIds: string[] }) {
    return this.roomService.getRoomsByIds(data.roomIds);
  }

  @MessagePattern("room.archive")
  async archiveRoom(@Payload() data: { roomId: string; userId: number; storageId: string; parentId: string | null; fileIds?: string[] }) {
    return this.archiveRoomService.archiveRoom(data);
  }

  @EventPattern("room.updateParticipants")
  async updateParticipants(@Payload() data: { roomId: string; count: number }) {
    await this.roomService.updateParticipantsCount(data.roomId, data.count);
  }
}
