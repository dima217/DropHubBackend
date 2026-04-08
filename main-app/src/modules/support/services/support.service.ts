import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupportTicket, SupportTicketStatus } from '../entities/support-ticket.entity';
import { CreateSupportTicketDto } from '../dto/create-support-ticket.dto';
import { CreateAnonymousSupportTicketDto } from '../dto/create-anonymous-support-ticket.dto';
import { GetSupportTicketsAdminDto } from '../dto/admin/get-support-tickets-admin.dto';
import { SupportGateway } from '../gateway/support.gateway';
import { randomUUID } from 'crypto';

@Injectable()
export class SupportService {
  constructor(
    @InjectRepository(SupportTicket)
    private readonly supportTicketRepository: Repository<SupportTicket>,
    private readonly supportGateway: SupportGateway,
  ) {}

  async createTicketByUser(userId: number, dto: CreateSupportTicketDto) {
    const anonymous = dto.anonymous === true;
    const ticket = this.supportTicketRepository.create({
      title: dto.title,
      details: dto.details,
      anonymous,
      userId: anonymous ? null : userId,
      status: SupportTicketStatus.OPEN,
    });
    const saved = await this.supportTicketRepository.save(ticket);
    this.supportGateway.sendSupportTicketCreated(saved.id, saved.userId ?? null);
    return saved;
  }

  async createAnonymousTicket(dto: CreateAnonymousSupportTicketDto) {
    const ticket = this.supportTicketRepository.create({
      title: dto.title,
      details: dto.details,
      anonymous: true,
      userId: null,
      contactEmail: dto.contactEmail ?? null,
      anonymousAccessToken: randomUUID(),
      status: SupportTicketStatus.OPEN,
    });
    const saved = await this.supportTicketRepository.save(ticket);
    this.supportGateway.sendSupportTicketCreated(saved.id, null);
    return {
      ...saved,
      anonymousAccessToken: ticket.anonymousAccessToken,
    };
  }

  async getAnonymousTicketById(ticketId: string, token: string) {
    const ticket = await this.supportTicketRepository
      .createQueryBuilder('ticket')
      .addSelect('ticket.anonymousAccessToken')
      .where('ticket.id = :ticketId', { ticketId })
      .andWhere('ticket.anonymous = true')
      .getOne();

    if (!ticket || ticket.anonymousAccessToken !== token) {
      throw new NotFoundException('Support ticket not found');
    }

    const { anonymousAccessToken, ...safeTicket } = ticket;
    return safeTicket;
  }

  async getMyTickets(userId: number) {
    return this.supportTicketRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async getMyTicketById(userId: number, ticketId: string) {
    const ticket = await this.supportTicketRepository.findOne({
      where: { id: ticketId, userId },
    });
    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }
    return ticket;
  }

  async getAdminTickets(params: GetSupportTicketsAdminDto) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;

    const qb = this.supportTicketRepository
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.user', 'user')
      .orderBy('ticket.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (params.status) {
      qb.andWhere('ticket.status = :status', { status: params.status });
    }
    if (params.email?.trim()) {
      qb.andWhere('LOWER(user.email) LIKE :email', {
        email: `%${params.email.trim().toLowerCase()}%`,
      });
    }
    if (params.q?.trim()) {
      qb.andWhere('(LOWER(ticket.title) LIKE :q OR LOWER(ticket.details) LIKE :q)', {
        q: `%${params.q.trim().toLowerCase()}%`,
      });
    }

    const [items, total] = await qb.getManyAndCount();
    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async respondTicket(ticketId: string, adminId: number, response: string, status?: SupportTicketStatus) {
    const ticket = await this.supportTicketRepository.findOne({ where: { id: ticketId } });
    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    ticket.adminResponse = response;
    ticket.respondedByAdminId = adminId;
    ticket.respondedAt = new Date();
    ticket.status = status ?? SupportTicketStatus.IN_PROGRESS;

    const saved = await this.supportTicketRepository.save(ticket);
    this.supportGateway.sendSupportTicketUpdate(ticketId, saved.userId ?? null);
    return saved;
  }

  async updateStatus(ticketId: string, status: SupportTicketStatus) {
    const ticket = await this.supportTicketRepository.findOne({ where: { id: ticketId } });
    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }
    ticket.status = status;
    const saved = await this.supportTicketRepository.save(ticket);
    this.supportGateway.sendSupportTicketUpdate(ticketId, saved.userId ?? null);
    return saved;
  }
}
