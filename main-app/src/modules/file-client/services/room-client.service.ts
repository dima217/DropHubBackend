import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  CreateRoomPayload,
  CreateRoomResult,
  DeleteRoomResult,
  RoomDto,
  UpdateRoomResult,
} from '../types/room';
import { RoomDetailsDto } from '@application/room/dto/room.details.dto';
import { UpdateRoomDto } from '@application/room/dto/update-room.dto';

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

  async updateRoomById(data: UpdateRoomDto): Promise<UpdateRoomResult> {
    return this.send<UpdateRoomResult, UpdateRoomDto>('room.update', data);
  }

  async bindFileToRoom(roomId: string, fileId: string): Promise<void> {
    return this.send<void, { roomId: string; fileId: string }>('room.bindFile', { roomId, fileId });
  }

  async deleteRoom(data: { roomId: string; userId: number }): Promise<DeleteRoomResult> {
    return this.send<DeleteRoomResult, { roomId: string; userId: number }>('room.delete', data);
  }

  async getRoomById(roomId: string): Promise<RoomDto | null> {
    return this.send<RoomDto | null, { roomId: string }>('room.getById', { roomId });
  }

  async getRoomDetailsById(roomId: string): Promise<RoomDetailsDto | null> {
    return this.send<RoomDetailsDto | null, { roomId: string }>('room.getDetailsById', { roomId });
  }

  async getRoomsByIds(roomIds: string[]): Promise<RoomDto[]> {
    return this.send<RoomDto[], { roomIds: string[] }>('room.getByIds', { roomIds });
  }

  updateParticipantsCount(roomId: string, count: number) {
    this.fileClient.emit('room.updateParticipants', {
      roomId,
      count,
    });
  }

  async archiveRoom(data: {
    roomId: string;
    userId: number;
    storageId: string;
    parentId: string | null;
    fileIds?: string[];
  }): Promise<{ success: boolean; roomId: string }> {
    return this.send<
      { success: boolean; roomId: string },
      {
        roomId: string;
        userId: number;
        storageId: string;
        parentId: string | null;
        fileIds?: string[];
      }
    >('room.archive', data);
  }
}
