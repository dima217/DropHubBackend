// upload-confirm.dto.ts
export class UploadConfirmDto {
  uploadId: string;
  roomId?: string;
  storageId?: string;
  parentId?: string;
  userId: number;
}
