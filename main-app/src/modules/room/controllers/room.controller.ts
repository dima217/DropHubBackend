import {
  Body,
  Controller,
  Post,
  Delete,
  UseGuards,
  Req,
  Get,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
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

@ApiTags('Rooms')
@Controller('/room')
export class RoomController {
  constructor(
    private readonly roomClient: RoomClientService,
    private readonly roomService: RoomService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('my-list')
  @ApiOperation({
    summary: 'Get user rooms',
    description: 'Retrieves all rooms that the authenticated user has access to.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of user rooms retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        rooms: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
              name: { type: 'string', example: 'My Room' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  })
  async getMyRooms(@Req() req: RequestWithUser) {
    const userId = req.user.id;
    const rooms = await this.roomService.getRoomsByUserId(userId);
    return { success: true, rooms };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Create a new room',
    description: 'Creates a new room. The authenticated user becomes the admin of the room.',
  })
  @ApiBody({ type: CreateRoomDto })
  @ApiResponse({
    status: 201,
    description: 'Room created successfully',
    schema: {
      type: 'object',
      properties: {
        _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
        name: { type: 'string', example: 'My Room' },
        createdAt: { type: 'string', format: 'date-time' },
        files: { type: 'array', items: { type: 'object' } },
        participants: { type: 'array', items: { type: 'object' } },
        owner: { type: 'object' },
        expiresAt: { type: 'string', format: 'date-time' },
        maxBytes: { type: 'number', example: 1000000000 },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createRoom(@Req() req: RequestWithUser, @Body() body: CreateRoomDto) {
    if (!body.username) {
      throw new BadRequestException('Username is required');
    }
    return this.roomService.createRoom(req.user.id, body.username, body.expiresAt);
  }

  @Delete()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(ResourceType.ROOM, [AccessRole.ADMIN, AccessRole.WRITE], 'body', 'roomId')
  @ApiOperation({
    summary: 'Delete a room',
    description: 'Deletes a room. Requires ADMIN or WRITE permission on the room.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        roomId: { type: 'string', example: '507f1f77bcf86cd799439011' },
      },
      required: ['roomId'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Room deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Room deleted' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Room not found' })
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
  @ApiOperation({
    summary: 'Add users to room',
    description:
      'Adds one or more users to a room with specified access role. Requires ADMIN or WRITE permission.',
  })
  @ApiBody({ type: AddUserToRoomDto })
  @ApiResponse({
    status: 200,
    description: 'Users added to room successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Users added to room' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Room or users not found' })
  async addUsersToRoom(@Req() req: RequestWithUser, @Body() body: AddUserToRoomDto) {
    return this.roomService.addUsersToRoom(req.user.id, body.roomId, body.targetUserIds, body.role);
  }

  @Post('remove-users')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(ResourceType.ROOM, [AccessRole.ADMIN, AccessRole.WRITE], 'body', 'roomId')
  @ApiOperation({
    summary: 'Remove users from room',
    description: 'Removes one or more users from a room. Requires ADMIN or WRITE permission.',
  })
  @ApiBody({ type: RemoveUserFromRoomDto })
  @ApiResponse({
    status: 200,
    description: 'Users removed from room successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Users removed from room' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Room or users not found' })
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
  @ApiOperation({
    summary: 'Get room details',
    description:
      'Retrieves detailed information about a room including files and permissions. Requires READ, WRITE, or ADMIN permission.',
  })
  @ApiParam({ name: 'roomId', description: 'Room ID', example: '507f1f77bcf86cd799439011' })
  @ApiResponse({
    status: 200,
    description: 'Room details retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
        name: { type: 'string', example: 'My Room' },
        files: { type: 'array', items: { type: 'object' } },
        owner: { type: 'object' },
        expiresAt: { type: 'string', format: 'date-time' },
        maxBytes: { type: 'number', example: 1000000000 },
        participants: { type: 'array', items: { type: 'object' } },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  async getRoomDetails(@Req() req: RequestWithUser, @Param('roomId') roomId: string) {
    return this.roomService.getRoomDetails(req.user.id, roomId);
  }
}
