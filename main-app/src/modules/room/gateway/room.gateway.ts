import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { WsJwtAuthGuard } from 'src/auth/guards/ws-jwt-auth.guard';
import type { USocket } from 'src/types/socket';
import type { RoomDto } from '@application/file-client/types/room';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class RoomsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RoomsGateway.name);

  @UseGuards(WsJwtAuthGuard)
  handleConnection(client: USocket) {
    this.logger.debug('Handshake auth:', client.handshake.auth);
  }

  handleDisconnect(client: USocket) {
    if (client.user?.id) {
      this.logger.log(`User ${client.user.id} disconnected`);
    }
  }

  @SubscribeMessage('subscribeToAdditionToRoom')
  @UseGuards(WsJwtAuthGuard)
  handleSubscribeToAddition(client: USocket) {
    client.join(`user:${client.user.id}`);
  }
  sendAddedToRoom(userId: number, roomDto: RoomDto) {
    this.server.to(`user:${userId}`).emit('addedToRoom', roomDto);
    this.logger.debug(`User ${userId} notified they were added to room ${roomDto.id}`);
  }

  @SubscribeMessage('subscribeToRemovalFromRoom')
  @UseGuards(WsJwtAuthGuard)
  handleSubscribeToRemoval(client: USocket) {
    client.join(`user:${client.user.id}`);
  }
  sendRemovedFromRoom(userId: number, roomId: string) {
    this.server.to(`user:${userId}`).emit('removedFromRoom', { roomId });
    this.logger.debug(`User ${userId} notified they were removed from room ${roomId}`);
  }

  @SubscribeMessage('subscribeToRoomUpdates')
  @UseGuards(WsJwtAuthGuard)
  handleSubscribeToRoom(client: USocket, @MessageBody() roomId: string) {
    client.join(`room:${roomId}`);
    this.logger.debug(`User ${client.user.id} joined room ${roomId}`);
  }
  sendRoomUpdate(roomId: string, payload: any) {
    this.server.to(`room:${roomId}`).emit('room:update', payload);
  }
}
