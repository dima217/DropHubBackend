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

export type FileConversionType =
  | 'csv_to_json'
  | 'json_to_csv'
  | 'xml_to_json'
  | 'json_to_xml'
  | 'xlsx_to_json'
  | 'docx_to_pdf'
  | 'pdf_to_text'
  | 'pdf_to_images'
  | 'pptx_to_pdf';

export interface ConvertFilePayload {
  roomId?: string;
  storageId?: string;
  parentId?: string | null;
  fileId: string;
  conversion: FileConversionType;
}

export interface ConvertFileResult {
  success: boolean;
  conversion: FileConversionType;
  sourceFileId: string;
  sourceChecksum: string;
  targetType: 'room' | 'storage';
  targetId: string;
  createdFiles: Array<{
    fileId: string;
    fileName: string;
    mimeType: string;
    size: number;
    text?: string;
  }>;
}
