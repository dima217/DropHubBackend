export interface FilesData {
  originalName: string;
  fileSize: number;
  mimeType: string;
  uploadToken?: string;
}

export interface UploadData {
  userId: number;
  uploaderIp?: string;
  roomId?: string;
  storageId?: string;
  files: FilesData[];
}
