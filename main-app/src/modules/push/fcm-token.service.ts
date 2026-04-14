import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@application/user/entities/user.entity';

/**
 * Persistence and lifecycle of FCM device tokens (separate from {@link FcmService} which sends messages).
 */
@Injectable()
export class FcmTokenService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /** Save or replace the device token; pass `null` or clear via {@link clearToken} to unregister pushes. */
  async saveToken(userId: number, token: string | null): Promise<void> {
    await this.userRepository.update(userId, { fcmToken: token });
  }

  async clearToken(userId: number): Promise<void> {
    await this.saveToken(userId, null);
  }
}
