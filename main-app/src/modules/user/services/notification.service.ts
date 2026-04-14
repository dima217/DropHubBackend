import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Notification } from '../entities/notification.entity';

type CreateNotificationPayload = {
  userId: number;
  type: string;
  title: string;
  body: string;
  data: Record<string, string>;
};

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  async createMany(payloads: CreateNotificationPayload[]): Promise<void> {
    if (payloads.length === 0) {
      return;
    }

    const entities = payloads.map((payload) => this.notificationRepository.create(payload));
    await this.notificationRepository.save(entities);
  }

  async getUserNotifications(userId: number, limit = 20, offset = 0): Promise<Notification[]> {
    const normalizedLimit = Math.max(1, Math.min(limit, 100));
    const normalizedOffset = Math.max(0, offset);

    return this.notificationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: normalizedLimit,
      skip: normalizedOffset,
    });
  }

  async markAsRead(userId: number, ids: number[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }

    await this.notificationRepository.update(
      {
        userId,
        id: In(ids),
      },
      { isRead: true },
    );
  }
}
