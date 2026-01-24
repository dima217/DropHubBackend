import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Room, RoomDocument } from './schemas/room.schema';
import { PermissionClientService, AccessRole, ResourceType } from '../permission-client/permission-client.service';
import { IRoomService } from './interfaces/room-service.interface';

interface AuthenticationDeleteRoomParams {
  userId: number;
  roomId: string;
}

interface AuthenticationCreateRoomParams {
  userId: number;
  username?: string;
}

@Injectable()
export class RoomService implements IRoomService {
  constructor(
    @InjectModel(Room.name) private readonly roomModel: Model<RoomDocument>,
    private readonly permissionClient: PermissionClientService,
  ) {}

  async getRoomsByUserID(userId: number) {
    // This will need to query permissions from main app via RabbitMQ
    // For now, placeholder
    return [];
  }

  async createRoom(params: AuthenticationCreateRoomParams) {
    try {
      const newRoom = new this.roomModel({
        createdAt: new Date(),
        maxBytes: 5000,
        owner: params.username ?? '',
      });

      const savedRoom = await newRoom.save();
      const roomId = savedRoom.id.toString();
      
      return {
        success: true,
        roomId,
      };
    } catch (err) {
      throw new InternalServerErrorException('Failed to create room', { cause: err });
    }
  }

  async getRoomById(roomId: string) {
    const room = await this.roomModel.findById(roomId).lean().exec();
    if (!room) {
      return null;
    }
    return this.mapRoomToDto(room);
  }

  async getRoomsByIds(roomIds: string[]) {
    if (roomIds.length === 0) {
      return [];
    }
    const rooms = await this.roomModel
      .find({ _id: { $in: roomIds } })
      .lean()
      .exec();
    return rooms.map((room) => this.mapRoomToDto(room));
  }

  private mapRoomToDto(room: any) {
    return {
      id: room._id.toString(),
      files: room.files?.map((f: any) => f.toString()) || [],
      groups: room.groups?.map((g: any) => g.toString()) || [],
      createdAt: room.createdAt?.toISOString() || new Date().toISOString(),
      participants: room.participants || [],
      owner: room.owner,
      expiresAt: room.expiresAt?.toISOString() || null,
      maxBytes: room.maxBytes || 0,
      uploadSession: room.uploadSession || {
        uploadId: undefined,
        status: 'IN_PROGRESS',
      },
    };
  }

  async bindFileToRoom(roomId: string, fileId: string) {
    await this.roomModel.findByIdAndUpdate(roomId, {
      $push: { files: fileId },
    });
  }

  async updateParticipantsCount(roomId: string, count: number) {
    await this.roomModel.findByIdAndUpdate(roomId, {
      $set: { participants: Array(count).fill('') },
    });
  }

  async deleteRoom(params: AuthenticationDeleteRoomParams) {
    if (!params.roomId) {
      throw new BadRequestException('Room ID is required.');
    }

    // Permission check is performed in main-app before calling this service

    try {
      const deletedRoom = await this.roomModel.findByIdAndDelete(params.roomId);

      if (!deletedRoom) {
        throw new NotFoundException('Room not found.');
      }
      
      return { message: 'Room deleted successfully' };
    } catch (err) {
      if (
        err instanceof NotFoundException ||
        err instanceof ForbiddenException ||
        err instanceof BadRequestException
      ) {
        throw err;
      }
      throw new InternalServerErrorException('Failed to delete room', { cause: err });
    }
  }
}

