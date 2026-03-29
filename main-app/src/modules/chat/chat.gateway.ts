import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { WsJwtAuthGuard } from 'src/auth/guards/ws-jwt-auth.guard';
import type { USocket } from 'src/types/socket';

@WebSocketGateway({
  cors: { origin: '*' },
  transports: ['websocket', 'polling'],
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(private readonly chatService: ChatService) {}

  @UseGuards(WsJwtAuthGuard)
  handleConnection(client: USocket) {
    this.logger.debug('Handshake auth chat gateway:', client.handshake.auth);
  }

  handleDisconnect(client: USocket) {
    if (client.user?.id) {
      this.logger.log(`User ${client.user.id} disconnected from chat`);
    }
  }

  private getUserId(client: USocket): string {
    return client.user.id.toString();
  }

  private room(channelId: string) {
    return `channel:${channelId}`;
  }

  @SubscribeMessage('chat.send')
  @UseGuards(WsJwtAuthGuard)
  async handleSend(
    @ConnectedSocket() client: USocket,
    @MessageBody()
    payload: {
      channel_id: string;
      content: string;
      client_request_id?: string;
      mentions?: string[];
      reply_to?: string;
    },
  ) {
    try {
      this.logger.warn('chat.send received:', payload);
      const userId = this.getUserId(client);
      this.logger.error(
        `chat.send received: user=${userId}, channel=${payload.channel_id}, request=${payload.client_request_id ?? 'none'}`,
      );
      const msg = await this.chatService.sendMessage(
        payload.channel_id,
        userId,
        payload.content,
        payload.client_request_id,
        payload.mentions,
        payload.reply_to,
      );
      client.join(this.room(payload.channel_id));
      const formatted = this.chatService.formatMessage(msg);
      this.logger.debug(`Message sent to ${payload.channel_id}: ${JSON.stringify(formatted)}`);
      this.server.to(this.room(payload.channel_id)).emit('chat.message', formatted);
      if (payload.client_request_id) {
        client.emit('chat.send.ack', {
          client_request_id: payload.client_request_id,
          message_id: msg.id,
          created_at: msg.createdAt,
        });
      }
    } catch (e) {
      client.emit('chat.error', {
        message: e instanceof Error ? e.message : 'Failed to send',
      });
    }
  }

  @SubscribeMessage('chat.edit')
  @UseGuards(WsJwtAuthGuard)
  async handleEdit(
    @ConnectedSocket() client: USocket,
    @MessageBody()
    payload: { channel_id: string; message_id: string; content: string },
  ) {
    try {
      const userId = this.getUserId(client);
      const msg = await this.chatService.editMessage(
        payload.channel_id,
        payload.message_id,
        userId,
        payload.content,
      );
      this.server.to(this.room(payload.channel_id)).emit('chat.edit', {
        channel_id: payload.channel_id,
        message_id: payload.message_id,
        content: msg.content,
        edited_at: msg.editedAt,
      });
    } catch (e) {
      client.emit('chat.error', {
        message: e instanceof Error ? e.message : 'Failed to edit',
      });
    }
  }

  @SubscribeMessage('chat.delete')
  @UseGuards(WsJwtAuthGuard)
  async handleDelete(
    @ConnectedSocket() client: USocket,
    @MessageBody()
    payload: { channel_id: string; message_id: string },
  ) {
    try {
      const userId = this.getUserId(client);
      const msg = await this.chatService.deleteMessage(
        payload.channel_id,
        payload.message_id,
        userId,
      );
      this.server.to(this.room(payload.channel_id)).emit('chat.delete', {
        channel_id: payload.channel_id,
        message_id: payload.message_id,
        deleted_at: msg.deletedAt,
        deleted_by: msg.deletedBy,
      });
    } catch (e) {
      client.emit('chat.error', {
        message: e instanceof Error ? e.message : 'Failed to delete',
      });
    }
  }

  @SubscribeMessage('chat.pin')
  @UseGuards(WsJwtAuthGuard)
  async handlePin(
    @ConnectedSocket() client: USocket,
    @MessageBody()
    payload: { channel_id: string; message_id: string; unpin?: boolean },
  ) {
    try {
      const userId = this.getUserId(client);
      const msg = await this.chatService.pinMessage(
        payload.channel_id,
        payload.message_id,
        userId,
        payload.unpin,
      );
      this.server.to(this.room(payload.channel_id)).emit('chat.pin', {
        channel_id: payload.channel_id,
        message_id: payload.message_id,
        pinned_at: msg.pinnedAt,
        pinned_by: msg.pinnedBy,
        unpin: payload.unpin,
      });
    } catch (e) {
      client.emit('chat.error', {
        message: e instanceof Error ? e.message : 'Failed to pin',
      });
    }
  }

  @SubscribeMessage('chat.typing')
  @UseGuards(WsJwtAuthGuard)
  handleTyping(
    @ConnectedSocket() client: USocket,
    @MessageBody()
    payload: { channel_id: string; is_typing: boolean },
  ) {
    const userId = this.getUserId(client);
    this.server.to(this.room(payload.channel_id)).emit('chat.typing', {
      user_id: userId,
      channel_id: payload.channel_id,
      is_typing: payload.is_typing,
    });
  }

  @SubscribeMessage('chat.read')
  @UseGuards(WsJwtAuthGuard)
  async handleRead(
    @ConnectedSocket() client: USocket,
    @MessageBody()
    payload: { channel_id: string; message_id: string },
  ) {
    try {
      const userId = this.getUserId(client);
      await this.chatService.setReadCursor(payload.channel_id, userId, payload.message_id);
      this.server.to(this.room(payload.channel_id)).emit('chat.read', {
        user_id: userId,
        message_id: payload.message_id,
      });
    } catch (e) {
      client.emit('chat.error', {
        message: e instanceof Error ? e.message : 'Failed to set read',
      });
    }
  }

  @SubscribeMessage('chat.react')
  @UseGuards(WsJwtAuthGuard)
  async handleReact(
    @ConnectedSocket() client: USocket,
    @MessageBody()
    payload: {
      channel_id: string;
      message_id: string;
      emoji: string;
      remove?: boolean;
    },
  ) {
    try {
      const userId = this.getUserId(client);
      await this.chatService.react(
        payload.channel_id,
        payload.message_id,
        userId,
        payload.emoji,
        payload.remove,
      );
      this.server.to(this.room(payload.channel_id)).emit('chat.react', {
        message_id: payload.message_id,
        user_id: userId,
        emoji: payload.emoji,
        remove: payload.remove,
      });
    } catch (e) {
      client.emit('chat.error', {
        message: e instanceof Error ? e.message : 'Failed to react',
      });
    }
  }

  @SubscribeMessage('chat.join')
  @UseGuards(WsJwtAuthGuard)
  handleJoin(
    @ConnectedSocket() client: USocket,
    @MessageBody() payload: { channel_id: string },
  ) {
    client.join(this.room(payload.channel_id));
  }

  @SubscribeMessage('chat.leave')
  @UseGuards(WsJwtAuthGuard)
  handleLeave(
    @ConnectedSocket() client: USocket,
    @MessageBody() payload: { channel_id: string },
  ) {
    client.leave(this.room(payload.channel_id));
  }
}
