import { FriendRequest } from '../entities/friend-request.entity';
import {
  FriendRequestDirection,
  FriendRequestWithProfileDto,
} from '../dto/friend-request-with-profile.dto';

export class FriendRequestMapper {
  static toDto(request: FriendRequest, currentUserId: number): FriendRequestWithProfileDto {
    const isOutgoing = request.senderId === currentUserId;

    const otherUser = isOutgoing ? request.receiver : request.sender;

    return {
      requestId: request.id,
      status: request.status,
      direction: isOutgoing ? FriendRequestDirection.OUTGOING : FriendRequestDirection.INCOMING,
      profile: {
        id: otherUser.id,
        avatarUrl: otherUser.profile?.avatarUrl ?? '',
        firstName: otherUser.profile?.firstName ?? '',
      },
    };
  }
}
