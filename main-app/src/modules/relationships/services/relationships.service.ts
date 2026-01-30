import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from 'src/modules/user/services/user.service';
import { FriendRequest, RequestStatus } from '../entities/friend-request.entity';
import { CentrifugoService } from 'src/modules/notification/centrifugo.service';
import { FriendService } from './friend.service';
import {
  FriendRequestDirection,
  FriendRequestWithProfileDto,
} from '../dto/friend-request-with-profile.dto';
import { FriendRequestMapper } from '../mappers/friend-request.mapper';
import { FriendsGateway } from '../gateway/friends.gateway';

@Injectable()
export class RelationshipsService {
  constructor(
    @InjectRepository(FriendRequest)
    private readonly requestRepository: Repository<FriendRequest>,
    private readonly friendService: FriendService,
    private readonly usersService: UsersService,
    private readonly friendsGateway: FriendsGateway,
    private readonly centrifugo: CentrifugoService,
  ) {}

  async sendFriendRequest(senderId: number, profileId: number): Promise<FriendRequest> {
    const targetUser = await this.usersService.findByProfileId(profileId);
    if (!targetUser) throw new NotFoundException('User not found.');
    const receiverId = targetUser.id;

    if (senderId === receiverId)
      throw new BadRequestException('Cannot send a request to yourself.');
    if (await this.friendService.areFriends(senderId, receiverId))
      throw new BadRequestException('Already friends.');

    const existingRequest = await this.requestRepository.findOne({
      where: [
        { senderId, receiverId, status: RequestStatus.PENDING },
        { senderId: receiverId, receiverId: senderId, status: RequestStatus.PENDING },
      ],
    });
    if (existingRequest) throw new BadRequestException('Active request already exists.');

    const request = this.requestRepository.create({ senderId, receiverId });
    await this.requestRepository.save(request);

    const fullRequest = await this.requestRepository.findOne({
      where: { id: request.id },
      relations: ['sender.profile', 'receiver.profile'],
    });

    if (fullRequest) {
      this.friendsGateway.sendIncomingFriendRequest(
        receiverId,
        FriendRequestMapper.toDto(fullRequest, receiverId),
      );
    }

    return request;
  }

  async acceptRequest(receiverId: number, requestId: number): Promise<void> {
    const request = await this.requestRepository.findOne({
      where: { id: requestId, receiverId, status: RequestStatus.PENDING },
    });
    if (!request) throw new NotFoundException('Request not found or inactive.');

    await this.friendService.createMutualFriends(request.senderId, receiverId);
    request.status = RequestStatus.ACCEPTED;
    await this.requestRepository.save(request);
  }

  async rejectRequest(receiverId: number, requestId: number): Promise<void> {
    const request = await this.requestRepository.findOne({
      where: { id: requestId, receiverId, status: RequestStatus.PENDING },
    });
    if (!request) throw new NotFoundException('Request not found or inactive.');

    request.status = RequestStatus.REJECTED;
    await this.requestRepository.save(request);
  }

  async cancelRequest(senderId: number, requestId: number): Promise<void> {
    const request = await this.requestRepository.findOne({
      where: { id: requestId, senderId, status: RequestStatus.PENDING },
    });
    if (!request) throw new NotFoundException('Request not found or already cancelled.');

    request.status = RequestStatus.CANCELED;
    await this.requestRepository.save(request);
  }

  async getAllRequestsForUser(userId: number): Promise<FriendRequestWithProfileDto[]> {
    const requests = await this.requestRepository.find({
      where: [{ sender: { id: userId } }, { receiver: { id: userId } }],
      relations: ['sender.profile', 'receiver.profile'],
      order: { createdAt: 'DESC' },
    });

    return requests.map((request) => {
      const isOutgoing = request.senderId === userId;

      const otherUser = isOutgoing ? request.receiver : request.sender;

      return {
        requestId: request.id,
        status: request.status,
        direction: isOutgoing ? FriendRequestDirection.OUTGOING : FriendRequestDirection.INCOMING,
        profile: {
          id: otherUser.id,
          avatarUrl: otherUser.profile.avatarUrl ?? '',
          firstName: otherUser.profile.firstName,
        },
      };
    });
  }
}
