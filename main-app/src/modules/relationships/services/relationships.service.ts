import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from 'src/modules/user/services/user.service';
import { FriendRequest, RequestStatus } from '../entities/friend-request.entity';
import { CentrifugoService } from 'src/modules/notification/centrifugo.service';
import { FriendService } from './friend.service';

@Injectable()
export class RelationshipsService {
  constructor(
    @InjectRepository(FriendRequest)
    private readonly requestRepository: Repository<FriendRequest>,
    private readonly friendService: FriendService,
    private readonly usersService: UsersService,
    private readonly centrifugo: CentrifugoService,
  ) {}

  async sendFriendRequest(senderId: number, targetEmail: string): Promise<FriendRequest> {
    const targetUser = await this.usersService.findUserForContact(targetEmail);
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

    await this.centrifugo.publish(`personal#${receiverId}`, {
      type: 'friend_request_received',
      title: 'New friend request',
      message: `User ${senderId} sent you a friend request.`,
      senderId,
    });

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

    await this.centrifugo.publish(`personal#${request.senderId}`, {
      type: 'friend_request_accepted',
      title: 'Friend request accepted',
      message: `User ${receiverId} accepted your friend request.`,
      receiverId,
    });
  }

  async rejectRequest(receiverId: number, requestId: number): Promise<void> {
    const request = await this.requestRepository.findOne({
      where: { id: requestId, receiverId, status: RequestStatus.PENDING },
    });
    if (!request) throw new NotFoundException('Request not found or inactive.');

    request.status = RequestStatus.REJECTED;
    await this.requestRepository.save(request);

    await this.centrifugo.publish(`personal#${request.senderId}`, {
      type: 'friend_request_rejected',
      title: 'Friend request rejected',
      message: `User ${receiverId} rejected your friend request.`,
      receiverId,
    });
  }

  async cancelRequest(senderId: number, requestId: number): Promise<void> {
    const request = await this.requestRepository.findOne({
      where: { id: requestId, senderId, status: RequestStatus.PENDING },
    });
    if (!request) throw new NotFoundException('Request not found or already cancelled.');

    request.status = RequestStatus.CANCELED;
    await this.requestRepository.save(request);

    await this.centrifugo.publish(`personal#${request.receiverId}`, {
      type: 'friend_request_cancelled',
      title: 'Friend request cancelled',
      message: `User ${senderId} cancelled the friend request.`,
      senderId,
    });
  }
}
