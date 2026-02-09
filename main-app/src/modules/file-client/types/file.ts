export interface FileMeta {
  _id: string;
  originalName: string;
  key: string;
  size: number;
  mimeType: string;
  uploaderIp?: string;
  expiresAt?: Date | null;
  storedName: string;
  creatorId?: number;
  uploadTime: Date;
  downloadCount: number;
}

export interface RoomWithFiles {
  _id: string;
  files: FileMeta[];
  createdAt?: Date;
  expiresAt?: Date | null;
}

export interface CreateFileMetaPayload {
  originalName: string;
  key: string;
  size: number;
  mimeType: string;
  uploaderIp?: string;
  expiresAt?: Date | null;
}

export interface UploadBasePayload {
  originalName: string;
  fileSize: number;
  mimeType: string;
  uploaderIp?: string;
}

export interface UploadToRoomPayload extends UploadBasePayload {
  userId: number;
  roomId: string;
}

export interface UploadToStoragePayload extends UploadBasePayload {
  userId: number;
  storageId: string;
}

export interface UploadByTokenPayload extends UploadBasePayload {
  uploadToken: string;
}

/**
 * Параметры инициализации multipart‑загрузки.
 * Схема упрощена — подгони под свои реальные DTO при необходимости.
 */
export interface InitMultipartParams {
  fileSize: number;
  fileName: string;
  totalParts: number;
  fileType: string;
  roomId: string;
}

export interface InitMultipartPayload {
  params: InitMultipartParams;
  ip: string;
}

export interface InitMultipartResult {
  uploadId: string;
  key: string;
  fileId: string;
  presignedUrls: Record<number, string>;
}

export interface SuccessResponse {
  success: boolean;
}

export interface RoomFileUpdateResponse {
  success: boolean;
  roomId: string;
}
