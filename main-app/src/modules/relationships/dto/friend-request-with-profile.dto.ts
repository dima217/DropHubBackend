import { RequestStatus } from '../entities/friend-request.entity';

export enum FriendRequestDirection {
  INCOMING = 'INCOMING',
  OUTGOING = 'OUTGOING',
}

export interface FriendRequestWithProfileDto {
  requestId: number;
  status: RequestStatus;
  direction: FriendRequestDirection;
  profile: {
    id: number;
    avatarUrl: string;
    firstName: string;
  };
}
