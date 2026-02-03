import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { CommentsService } from '../services/comments.service';
import { Logger, UseGuards } from '@nestjs/common';
import { WsJwtAuthGuard } from 'src/auth/guards/ws-jwt-auth.guard';
import type { USocket } from 'src/types/socket';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class CommentsGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(CommentsGateway.name);

  constructor(private readonly commentsService: CommentsService) {}

  @UseGuards(WsJwtAuthGuard)
  handleConnection(client: USocket) {
    this.logger.debug('Handshake auth message:', client.handshake.auth);
  }

  handleDisconnect(client: USocket) {
    if (client.user?.id) {
      this.logger.log(`User ${client.user.id} disconnected`);
    }
  }

  /* ================= JOIN / LEAVE ================= */

  @SubscribeMessage('join_room')
  handleJoinRoom(@MessageBody('roomId') roomId: string, @ConnectedSocket() client: Socket) {
    client.join(`room:${roomId}`);
  }

  @SubscribeMessage('leave_room')
  handleLeaveRoom(@MessageBody('roomId') roomId: string, @ConnectedSocket() client: Socket) {
    client.leave(`room:${roomId}`);
  }

  /* ================= SEND MESSAGE ================= */

  @SubscribeMessage('send_message')
  @UseGuards(WsJwtAuthGuard)
  async handleSendMessage(
    @ConnectedSocket() client: USocket,
    @MessageBody() dto: { roomId: string; content: string },
  ) {
    this.logger.debug('sent init');
    const userId = client.user.id;

    const message = await this.commentsService.createComment(userId, {
      roomId: dto.roomId,
      content: dto.content,
    });

    this.logger.debug(`${message?.id} has been sent to ${dto.roomId}`);
    this.server.to(`room:${dto.roomId}`).emit('new_message', message);

    return { success: true };
  }

  @SubscribeMessage('update_message')
  async handleUpdateMessage(
    @ConnectedSocket() client: USocket,
    @MessageBody() body: { commentId: string; content: string },
  ) {
    const userId = client.user.id;

    const updated = await this.commentsService.updateComment(userId, body.commentId, {
      content: body.content,
    });

    this.server.to(`room:${updated.roomId}`).emit('message_updated', updated);

    return { success: true };
  }

  @SubscribeMessage('delete_message')
  async handleDeleteMessage(
    @ConnectedSocket() client: USocket,
    @MessageBody() body: { commentId: string },
  ) {
    const userId = client.user.id;

    const comment = await this.commentsService.findById(body.commentId);

    await this.commentsService.deleteComment(userId, body.commentId);

    this.server.to(`room:${comment.roomId}`).emit('message_deleted', { id: body.commentId });

    return { success: true };
  }
}
