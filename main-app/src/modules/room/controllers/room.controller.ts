import { Body, Controller, Post, Delete, UseGuards, Req, Get, Param } from '@nestjs/common';
import type { DeleteRoomBody } from '../interfaces/room-request.interface';
import { RoomClientService } from '../../file-client/services/room-client.service';
import type { RequestWithUser } from 'src/types/express';
import { CreateRoomDto } from '../dto/create-room.dro';
import { AddUserToRoomDto } from '../dto/add-user-to-room.dto';
import { RemoveUserFromRoomDto } from '../dto/remove-user-from-room.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-guard';
import { PermissionGuard } from 'src/auth/guards/permission.guard';
import { RequirePermission } from 'src/auth/common/decorators/permission.decorator';
import { ResourceType, AccessRole } from 'src/modules/permission/entities/permission.entity';
import { RoomService } from '../services/room.service';

@Controller('/room')
export class RoomController {
  constructor(
    private readonly roomClient: RoomClientService,
    private readonly roomService: RoomService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('my-list')
  async getMyRooms(@Req() req: RequestWithUser) {
    const userId = req.user.id;
    const rooms = await this.roomService.getRoomsByUserId(userId);
    return { success: true, rooms };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async createRoom(@Req() req: RequestWithUser, @Body() body: CreateRoomDto) {
    return this.roomService.createRoom(req.user.id, body.username);
  }

  @Delete()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(ResourceType.ROOM, [AccessRole.ADMIN, AccessRole.WRITE], 'body', 'roomId')
  async deleteRoom(@Req() req: RequestWithUser, @Body() body: DeleteRoomBody) {
    const deleteData = {
      roomId: body.roomId,
      userId: req.user.id,
    };
    return this.roomClient.deleteRoom(deleteData);
  }

  @Post('add-users')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(ResourceType.ROOM, [AccessRole.ADMIN, AccessRole.WRITE], 'body', 'roomId')
  async addUsersToRoom(@Req() req: RequestWithUser, @Body() body: AddUserToRoomDto) {
    return this.roomService.addUsersToRoom(req.user.id, body.roomId, body.targetUserIds, body.role);
  }

  @Post('remove-users')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(ResourceType.ROOM, [AccessRole.ADMIN, AccessRole.WRITE], 'body', 'roomId')
  async removeUsersFromRoom(@Req() req: RequestWithUser, @Body() body: RemoveUserFromRoomDto) {
    return this.roomService.removeUsersFromRoom(req.user.id, body.roomId, body.targetUserIds);
  }

  @Get(':roomId/details')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(
    ResourceType.ROOM,
    [AccessRole.ADMIN, AccessRole.READ, AccessRole.WRITE],
    'params',
    'roomId',
  )
  async getRoomDetails(@Req() req: RequestWithUser, @Param('roomId') roomId: string) {
    return this.roomService.getRoomDetails(req.user.id, roomId);
  }
}
