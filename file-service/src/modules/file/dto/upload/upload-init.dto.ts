// upload-init.dto.ts
export class UploadInitDto {
  originalName: string;
  mimeType: string;
  fileSize: number;
  roomId?: string;
  storageId?: string;
}
