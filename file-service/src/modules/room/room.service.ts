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

interface AuthenticationDeleteRoomParams {
  userId: number;
  roomId: string;
}

interface AuthenticationCreateRoomParams {
  userId: number;
  username?: string;
}

@Injectable()
export class RoomService {
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

  async getRoomById(roomId: string): Promise<Partial<Room> | null> {
    return this.roomModel.findById(roomId).lean().exec();
  }

  async bindFileToRoom(roomId: string, fileId: string) {
    await this.roomModel.findByIdAndUpdate(roomId, {
      $push: { files: fileId },
    });
  }

  async deleteRoom(params: AuthenticationDeleteRoomParams) {
    if (!params.roomId) {
      throw new BadRequestException('Room ID is required.');
    }

    await this.permissionClient.verifyUserAccess(params.userId, params.roomId, ResourceType.ROOM, [
      AccessRole.ADMIN,
    ]);

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

