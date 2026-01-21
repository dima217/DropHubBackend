import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { RoomService } from './room.service';

@Controller()
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @MessagePattern('room.create')
  async createRoom(@Payload() data: { userId: number; username?: string }) {
    return this.roomService.createRoom(data);
  }

  @MessagePattern('room.getByUserId')
  async getRoomsByUserId(@Payload() data: { userId: number }) {
    return this.roomService.getRoomsByUserID(data.userId);
  }

  @MessagePattern('room.bindFile')
  async bindFile(@Payload() data: { roomId: string; fileId: string }) {
    return this.roomService.bindFileToRoom(data.roomId, data.fileId);
  }

  @MessagePattern('room.delete')
  async deleteRoom(@Payload() data: { roomId: string; userId: number }) {
    return this.roomService.deleteRoom(data);
  }
}

