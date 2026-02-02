import { FileMeta } from './file';

export interface RoomDto {
  id: string;
  files: string[];
  createdAt: string;
  participants: number;
  owner?: string;
  expiresAt?: string | null;
  maxBytes: number;
  userRole?: string;
}

export interface RoomDetailsDto {
  id: string;
  files: FileMeta[];
  createdAt: string;
  participants: number;
  owner?: string;
  expiresAt?: string | null;
  maxBytes: number;
  userRole?: string;
}

export interface CreateRoomPayload {
  userId: number;
  username?: string;
  expiresAt?: string;
}

export interface CreateRoomResult {
  success: boolean;
  roomId: string;
}

export interface DeleteRoomResult {
  message: string;
}
