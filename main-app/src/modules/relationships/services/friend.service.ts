import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Friend } from '../entities/friend.entity';
import { normalizeIds } from '../utils/additional.functions';

@Injectable()
export class FriendService {
  constructor(
    @InjectRepository(Friend)
    private readonly friendRepository: Repository<Friend>,
  ) {}

  async areFriends(userAId: number, userBId: number): Promise<boolean> {
    if (userAId === userBId) return true;
    const { userOneId, userTwoId } = normalizeIds(userAId, userBId);
    const friendEntry = await this.friendRepository.findOne({
      where: { userOneId, userTwoId },
    });
    return !!friendEntry;
  }

  async createMutualFriends(userAId: number, userBId: number): Promise<void> {
    if (userAId === userBId) return;
    const { userOneId, userTwoId } = normalizeIds(userAId, userBId);
    const isAlreadyFriend = await this.areFriends(userAId, userBId);
    if (isAlreadyFriend) return;
    const newFriendship = this.friendRepository.create({ userOneId, userTwoId });
    await this.friendRepository.save(newFriendship);
  }

  async getFriends(userId: number): Promise<Friend[]> {
    return this.friendRepository.find({
      where: [{ userOneId: userId }, { userTwoId: userId }],
    });
  }

  async removeFriend(currentUserId: number, friendIdToRemove: number): Promise<void> {
    const { userOneId, userTwoId } = normalizeIds(currentUserId, friendIdToRemove);

    const deleteResult = await this.friendRepository.delete({
      userOneId: userOneId,
      userTwoId: userTwoId,
    });

    if (deleteResult.affected === 0) {
      throw new NotFoundException(
        `Friendship between users ${currentUserId} and ${friendIdToRemove} not found.`,
      );
    }
  }
}
