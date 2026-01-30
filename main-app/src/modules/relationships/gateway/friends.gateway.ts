import {
  WebSocketGateway,
  SubscribeMessage,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { WsJwtAuthGuard } from 'src/auth/guards/ws-jwt-auth.guard';
import type { USocket } from 'src/types/socket';
import { FriendRequestWithProfileDto } from '../dto/friend-request-with-profile.dto';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class FriendsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(FriendsGateway.name);

  @UseGuards(WsJwtAuthGuard)
  handleConnection(client: USocket) {
    this.logger.debug('Handshake auth:', client.handshake.auth);
  }

  handleDisconnect(client: USocket) {
    if (client.user?.id) {
      this.logger.log(`User ${client.user.id} disconnected`);
    }
  }

  @SubscribeMessage('subscribeToFriends')
  @UseGuards(WsJwtAuthGuard)
  handleSubscribe(client: USocket) {
    client.join(`user:${client.user.id}`);
  }
  sendIncomingFriendRequest(receiverUserId: number, payload: FriendRequestWithProfileDto) {
    this.server.to(`user:${receiverUserId}`).emit('friendRequest', payload);

    this.logger.debug(`Friend request ${payload.requestId} sent to user:${receiverUserId}`);
  }
}
