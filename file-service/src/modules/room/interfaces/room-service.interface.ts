export interface IRoomService {
  getRoomsByUserID(userId: number): Promise<any[]>;
  createRoom(params: { userId: number; username?: string }): Promise<{
    success: boolean;
    roomId: string;
  }>;
  getRoomById(roomId: string): Promise<any | null>;
  getRoomsByIds(roomIds: string[]): Promise<any[]>;
  bindFileToRoom(roomId: string, fileId: string): Promise<void>;
  updateParticipantsCount(roomId: string, count: number): Promise<void>;
  deleteRoom(params: {
    userId: number;
    roomId: string;
  }): Promise<{ message: string }>;
  removeFilesFromRoom(roomId: string, fileIds: string[]): Promise<void>;
}
