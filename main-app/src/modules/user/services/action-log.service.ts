import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActionLog } from '../entities/action-log.entity';

@Injectable()
export class ActionLogService {
  constructor(
    @InjectRepository(ActionLog)
    private readonly actionLogRepository: Repository<ActionLog>,
  ) {}

  async logHttpAction(payload: {
    userId: number | null;
    userRole: string | null;
    method: string;
    path: string;
    statusCode: number;
    durationMs: number;
    ip: string | null;
    userAgent: string | null;
    query?: Record<string, unknown> | null;
    body?: Record<string, unknown> | null;
  }): Promise<void> {
    await this.actionLogRepository.save(
      this.actionLogRepository.create({
        ...payload,
        query: payload.query ?? null,
        body: payload.body ?? null,
      }),
    );
  }

  async getLogsSince(date: Date): Promise<ActionLog[]> {
    return this.actionLogRepository
      .createQueryBuilder('log')
      .where('log.createdAt >= :date', { date })
      .orderBy('log.createdAt', 'DESC')
      .getMany();
  }
}
