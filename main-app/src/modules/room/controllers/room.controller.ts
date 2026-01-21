import { Body, Controller, Post, Delete, UseGuards, Req } from '@nestjs/common';
import type { DeleteRoomBody } from '../interfaces/room-request.interface';
import { RoomClientService } from '../../file-client/services/room-client.service';
import type { RequestWithUser } from 'src/types/express';
import { CreateRoomDto } from '../dto/create-room.dro';
import { JwtAuthGuard } from 'src/auth/guards/jwt-guard';

@Controller('/room')
export class RoomController {
  constructor(private readonly roomClient: RoomClientService) {}

  @UseGuards(JwtAuthGuard)
  @Post('my-list')
  async getMyRooms(@Req() req: RequestWithUser) {
    const userId = req.user.id;
    const rooms = await this.roomClient.getRoomsByUserId(userId);
    return { success: true, rooms };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async createRoom(@Req() req: RequestWithUser, @Body() body: CreateRoomDto) {
    const createData = {
      userId: req.user.id,
      username: body.username,
    };
    return this.roomClient.createRoom(createData);
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  async deleteRoom(@Req() req: RequestWithUser, @Body() body: DeleteRoomBody) {
    const deleteData = {
      roomId: body.roomId,
      userId: req.user.id,
    };
    return this.roomClient.deleteRoom(deleteData);
  }
}
