import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  WsException,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { WsJwtAuthGuard } from 'src/auth/guards/ws-jwt-auth.guard';
import type { USocket } from 'src/types/socket';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupportTicket } from '../entities/support-ticket.entity';

@WebSocketGateway({
  cors: { origin: '*' },
  transports: ['websocket', 'polling'],
})
export class SupportGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SupportGateway.name);

  constructor(
    @InjectRepository(SupportTicket)
    private readonly supportTicketRepository: Repository<SupportTicket>,
  ) {}

  @UseGuards(WsJwtAuthGuard)
  handleConnection(client: USocket) {
    this.logger.debug(`Support gateway connected user=${client.user?.id ?? 'unknown'}`);
  }

  handleDisconnect(client: USocket) {
    if (client.user?.id) {
      this.logger.log(`User ${client.user.id} disconnected from support gateway`);
    }
  }

  @SubscribeMessage('support.subscribeUser')
  @UseGuards(WsJwtAuthGuard)
  handleSubscribeToSupport(@ConnectedSocket() client: USocket) {
    client.join(`user:${client.user.id}`);
  }

  @SubscribeMessage('support.subscribeTicket')
  @UseGuards(WsJwtAuthGuard)
  handleSubscribeTicket(
    @ConnectedSocket() client: USocket,
    @MessageBody() payload: { ticketId: string },
  ) {
    client.join(`support:${payload.ticketId}`);
  }

  @SubscribeMessage('support.subscribeAnonymousTicket')
  async handleSubscribeAnonymousTicket(
    @ConnectedSocket() client: USocket,
    @MessageBody() payload: { ticketId: string; token: string },
  ) {
    const ticket = await this.supportTicketRepository
      .createQueryBuilder('ticket')
      .addSelect('ticket.anonymousAccessToken')
      .where('ticket.id = :ticketId', { ticketId: payload.ticketId })
      .andWhere('ticket.anonymous = true')
      .getOne();

    if (!ticket || ticket.anonymousAccessToken !== payload.token) {
      throw new WsException('Forbidden');
    }

    client.join(`support:${payload.ticketId}`);
  }

  @SubscribeMessage('support.subscribeAdmin')
  @UseGuards(WsJwtAuthGuard)
  handleSubscribeAdmin(@ConnectedSocket() client: USocket) {
    if (client.user?.role !== 'admin') {
      throw new WsException('Forbidden');
    }
    client.join('support:admin');
  }

  sendSupportTicketCreated(ticketId: string, userId: number | null) {
    this.server.to('support:admin').emit('support.ticket.created', { ticketId, userId });
    if (userId) {
      this.server.to(`user:${userId}`).emit('support.ticket.created', { ticketId });
    }
  }

  sendSupportTicketUpdate(ticketId: string, userId?: number | null) {
    const event = { ticketId };
    this.server.to(`support:${ticketId}`).emit('support.ticket.updated', event);
    this.server.to('support:admin').emit('support.ticket.updated', event);
    if (userId) {
      this.server.to(`user:${userId}`).emit('support.ticket.updated', event);
    }
    this.logger.debug(`Support ticket ${ticketId} updated`);
  }

  @SubscribeMessage('support.unsubscribeUser')
  @UseGuards(WsJwtAuthGuard)
  handleUnsubscribe(@ConnectedSocket() client: USocket) {
    client.leave(`user:${client.user.id}`);
  }
}
  