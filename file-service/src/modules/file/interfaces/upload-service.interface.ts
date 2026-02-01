import { UploadConfirmDto } from "../dto/upload/upload-confirm.dto";
import { UploadData } from "../interfaces/file-request.interface";

export interface IUploadService {
  initUploads(
    params: UploadData
  ): Promise<{ uploadUrl: string; uploadId: string }[]>;
  confirmUpload(
    params: UploadConfirmDto
  ): Promise<{ success: boolean; fileId: string }>;
}
