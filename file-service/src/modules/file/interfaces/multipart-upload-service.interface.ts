import { UploadInitMultipartDto } from "../dto/upload/multipart/upload-init-multipart.dto";
import { UploadCompleteDto } from "../dto/upload/multipart/upload-complete.dto";

export interface IMultipartUploadService {
  initUploadMultipart(
    params: UploadInitMultipartDto,
    ip: string
  ): Promise<{
    uploadId: string;
    key: string;
    fileId: any;
    presignedUrls: Record<number, string>;
  }>;
  completeMultipart(params: UploadCompleteDto): Promise<void>;
}
