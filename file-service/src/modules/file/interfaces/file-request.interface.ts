export interface UploadData {
  originalName: string;
  fileSize: number;
  mimeType: string;
  roomId?: string;
  storageId?: string;
  uploaderIp?: string;
  userId?: number;
  uploadToken?: string;
}
