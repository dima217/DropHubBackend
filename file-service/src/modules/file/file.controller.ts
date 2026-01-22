import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { FileService } from './file.service';
import { UploadService } from './services/upload/upload.service';
import { DownloadService } from './services/download/download.service';
import { MultipartUploadService } from './services/upload/multipart.upload.service';
import { PreviewService } from './services/preview/preview.service';
import { UploadInitMultipartDto } from './dto/upload/upload-init-multipart.dto';

@Controller()
export class FileController {
  constructor(
    private readonly fileService: FileService,
    private readonly uploadService: UploadService,
    private readonly downloadService: DownloadService,
    private readonly multipartUploadService: MultipartUploadService,
    private readonly previewService: PreviewService,
  ) {}

  @MessagePattern('file.create')
  async createFile(@Payload() data: any) {
    return this.fileService.createFileMeta(data);
  }

  @MessagePattern('file.getById')
  async getFileById(@Payload() data: { fileId: string }) {
    return this.fileService.getFileById(data.fileId);
  }

  @MessagePattern('file.getByUploadId')
  async getFileByUploadId(@Payload() data: { uploadId: string }) {
    return this.fileService.getFileByUploadId(data.uploadId);
  }

  @MessagePattern('file.getByRoom')
  async getFilesByRoom(@Payload() data: { roomId: string; userId: number }) {
    return this.fileService.getFilesByRoomID(data);
  }

  @MessagePattern('file.delete')
  async deleteFiles(@Payload() data: { fileIds: string[] }) {
    return this.fileService.deleteFiles(data);
  }

  // Upload operations
  @MessagePattern('file.uploadToRoom')
  async uploadFileToRoom(@Payload() data: any) {
    return this.uploadService.uploadFileToRoom(data);
  }

  @MessagePattern('file.uploadToStorage')
  async uploadFileToStorage(@Payload() data: any) {
    return this.uploadService.uploadFileToStorage(data);
  }

  @MessagePattern('file.uploadByToken')
  async uploadFileByToken(@Payload() data: any) {
    return this.uploadService.uploadFileByToken(data);
  }

  // Download operations
  @MessagePattern('file.getDownloadLink')
  async getDownloadLink(@Payload() data: { fileId: string; userId: number }) {
    return this.downloadService.getDownloadLinkAuthenticated(data);
  }

  @MessagePattern('file.getDownloadLinkByToken')
  async getDownloadLinkByToken(@Payload() data: { downloadToken: string }) {
    return this.downloadService.downloadFileByToken(data);
  }

  @MessagePattern('file.getStream')
  async getStream(@Payload() data: { key: string }) {
    return this.downloadService.getStream(data.key);
  }

  // Multipart upload
  @MessagePattern('file.multipart.init')
  async initMultipart(@Payload() data: UploadInitMultipartDto & { ip?: string }) {
    const { ip, ...params } = data;
    return this.multipartUploadService.initUploadMultipart(params, ip || '');
  }

  @MessagePattern('file.multipart.complete')
  async completeMultipart(@Payload() data: any) {
    return this.multipartUploadService.completeMultipart(data);
  }

  @MessagePattern('file.getExpired')
  async getExpiredFiles(@Payload() data: { beforeDate?: Date }) {
    return this.fileService.getExpiredFiles(data.beforeDate);
  }

  @MessagePattern('file.deleteCompletely')
  async deleteFileCompletely(@Payload() data: { storedName: string }) {
    await this.fileService.deleteFileCompletely(data.storedName);
    return { success: true };
  }

  @MessagePattern('file.search')
  async searchFiles(
    @Payload()
    data: {
      roomIds: string[];
      query?: string;
      mimeType?: string;
      creatorId?: number;
      limit?: number;
      offset?: number;
    },
  ) {
    return this.fileService.searchFiles(data);
  }

  // Preview operations
  @MessagePattern('file.getPreviewUrl')
  async getPreviewUrl(@Payload() data: { fileId: string; userId: number }) {
    return this.previewService.getPreviewUrl(data);
  }

  @MessagePattern('file.getVideoThumbnailUrl')
  async getVideoThumbnailUrl(@Payload() data: { fileId: string; userId: number }) {
    return this.previewService.getVideoThumbnailUrl(data);
  }

  @MessagePattern('file.getVideoStreamUrl')
  async getVideoStreamUrl(@Payload() data: { fileId: string; userId: number }) {
    return this.previewService.getVideoStreamUrl(data);
  }
}
