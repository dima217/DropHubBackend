// upload-confirm.dto.ts
export class UploadConfirmDto {
  uploadId: string;
  roomId?: string;
  storageId?: string;
  resourceId?: string;
  parentId?: string;
  userId: number;
}
