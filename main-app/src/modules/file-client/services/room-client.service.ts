import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { CreateRoomPayload, CreateRoomResult, DeleteRoomResult, RoomDto } from '../types/room';

@Injectable()
export class RoomClientService {
  constructor(@Inject('FILE_SERVICE') private readonly fileClient: ClientProxy) {}

  private send<TResponse, TPayload = unknown>(
    pattern: string,
    payload: TPayload,
  ): Promise<TResponse> {
    return firstValueFrom(this.fileClient.send<TResponse, TPayload>(pattern, payload));
  }

  async createRoom(data: CreateRoomPayload): Promise<CreateRoomResult> {
    return this.send<CreateRoomResult, CreateRoomPayload>('room.create', data);
  }

  async getRoomsByUserId(userId: number): Promise<RoomDto[]> {
    return this.send<RoomDto[], { userId: number }>('room.getByUserId', { userId });
  }

  async bindFileToRoom(roomId: string, fileId: string): Promise<void> {
    return this.send<void, { roomId: string; fileId: string }>('room.bindFile', { roomId, fileId });
  }

  async deleteRoom(data: { roomId: string; userId: number }): Promise<DeleteRoomResult> {
    return this.send<DeleteRoomResult, { roomId: string; userId: number }>('room.delete', data);
  }
}
