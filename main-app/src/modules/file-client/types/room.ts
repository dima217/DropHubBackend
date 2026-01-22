export interface RoomDto {
  id: string;
  files: string[];
  groups: string[];
  createdAt: string;
  participants: string[];
  owner?: string;
  expiresAt?: string | null;
  maxBytes: number;
  uploadSession: {
    uploadId?: string;
    status: string;
  };
  userRole?: string;
}

export interface CreateRoomPayload {
  userId: number;
  username?: string;
}

export interface CreateRoomResult {
  success: boolean;
  roomId: string;
}

export interface DeleteRoomResult {
  message: string;
}
