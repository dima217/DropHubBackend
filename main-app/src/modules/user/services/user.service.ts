import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import * as argon2 from 'argon2';
import { User } from '../entities/user.entity';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UpdateUserResetDto } from '../dto/update-user-reset.dto';

const USER_SELECT_FIELDS = [
  'id',
  'uuid',
  'email',
  'role',
  'isBanned',
  'isOAuthUser',
  'refreshToken',
] as const;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findAllPaginated(page: number, limit: number): Promise<[User[], number]> {
    return this.userRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { id: 'ASC' },
    });
  }

  async getUserById(id: number): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['profile'],
    });
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { email },
      relations: ['profile'],
    });
    return user;
  }

  async findByProfileId(profileId: number): Promise<User | null> {
    return this.userRepository.findOne({
      where: {
        profile: { id: profileId },
      },
      relations: ['profile'],
    });
  }

  async findByUuid(uuid: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { uuid },
      select: [...USER_SELECT_FIELDS],
    });
  }

  async createUserTransactional(data: Partial<User>, manager: EntityManager): Promise<User> {
    const user = manager.create(User, data);
    return manager.save(user);
  }

  async updateUser(id: number, dto: UpdateUserDto): Promise<User> {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return this.userRepository.save({ ...user, ...dto });
  }

  async updatePassword(id: number, newPassword: string): Promise<void> {
    await this.userRepository.update(id, {
      password: await argon2.hash(newPassword),
    });
  }

  async updateUserToken(id: number, dto: UpdateUserResetDto): Promise<void> {
    await this.userRepository.update(id, {
      resetPasswordToken: dto.resetPasswordToken,
      tokenExpiredDate: dto.tokenExpiredDate,
    });
  }

  async updateRefreshToken(userId: number, refreshToken: string | null): Promise<void> {
    await this.userRepository.update(userId, {
      refreshToken: refreshToken ? await argon2.hash(refreshToken) : null,
    });
  }

  async incrementTokenVersion(userId: number): Promise<void> {
    const user = await this.getUserById(userId);
    if (user) {
      user.tokenVersion++;
      await this.userRepository.save(user);
    }
  }

  async remove(id: number): Promise<void> {
    await this.userRepository.delete(id);
  }

  async getUsersByIds(ids: number[]): Promise<User[]> {
    if (ids.length === 0) {
      return [];
    }

    return this.userRepository.find({
      where: {
        id: In(ids),
      },
      relations: ['profile'],
    });
  }
}
