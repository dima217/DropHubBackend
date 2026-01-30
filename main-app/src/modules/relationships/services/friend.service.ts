import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Friend } from '../entities/friend.entity';
import { normalizeIds } from '../utils/additional.functions';
import { FriendWithProfileDto } from '../dto/friend-with-profile.dto';

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

  async getFriendsWithProfiles(userId: number): Promise<FriendWithProfileDto[]> {
    const friendships = await this.friendRepository.find({
      where: [{ userOneId: userId }, { userTwoId: userId }],
      relations: ['userOne.profile', 'userTwo.profile'],
    });

    if (friendships.length === 0) {
      return [];
    }
    return friendships.map((friendship) => {
      const friendUser = friendship.userOneId === userId ? friendship.userTwo : friendship.userOne;

      return {
        friendshipId: friendship.id,
        friendProfile: {
          id: friendUser.id,
          avatarUrl: friendUser.profile.avatarUrl ?? '',
          firstName: friendUser.profile.firstName,
        },
      };
    });
  }

  async removeFriend(currentUserId: number, friendshipId: number): Promise<void> {
    const friendship = await this.friendRepository.findOne({
      where: { id: friendshipId },
    });

    if (!friendship) {
      throw new NotFoundException(`Friendship ${friendshipId} not found.`);
    }

    if (friendship.userOneId !== currentUserId && friendship.userTwoId !== currentUserId) {
      throw new ForbiddenException('You are not part of this friendship.');
    }

    await this.friendRepository.delete({ id: friendshipId });
  }
}
