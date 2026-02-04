import { Controller, Inject } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { UploadInitMultipartDto } from "./dto/upload/multipart/upload-init-multipart.dto";
import {
  FILE_SERVICE_TOKEN,
  UPLOAD_SERVICE_TOKEN,
  DOWNLOAD_SERVICE_TOKEN,
  MULTIPART_UPLOAD_SERVICE_TOKEN,
  PREVIEW_SERVICE_TOKEN,
} from "./interfaces/file-service.tokens";
import type {
  IFileService,
  IUploadService,
  IDownloadService,
  IMultipartUploadService,
  IPreviewService,
} from "./interfaces";
import type { UploadData } from "./interfaces/file-request.interface";
import { UploadConfirmDto } from "./dto/upload/upload-confirm.dto";
import { UpdateFileDto } from "./dto/update-file.dto";

@Controller()
export class FileController {
  constructor(
    @Inject(FILE_SERVICE_TOKEN) private readonly fileService: IFileService,
    @Inject(UPLOAD_SERVICE_TOKEN)
    private readonly uploadService: IUploadService,
    @Inject(DOWNLOAD_SERVICE_TOKEN)
    private readonly downloadService: IDownloadService,
    @Inject(MULTIPART_UPLOAD_SERVICE_TOKEN)
    private readonly multipartUploadService: IMultipartUploadService,
    @Inject(PREVIEW_SERVICE_TOKEN)
    private readonly previewService: IPreviewService
  ) {}

  @MessagePattern("file.create")
  async createFile(@Payload() data: any) {
    return this.fileService.createFileMeta(data);
  }

  @MessagePattern("file.getById")
  async getFileById(@Payload() data: { fileId: string }) {
    return this.fileService.getFileById(data.fileId);
  }

  @MessagePattern("file.getByUploadId")
  async getFileByUploadId(@Payload() data: { uploadId: string }) {
    return this.fileService.getFileByUploadId(data.uploadId);
  }

  @MessagePattern("file.getByRoom")
  async getFilesByRoom(@Payload() data: { roomId: string; userId: number }) {
    return this.fileService.getFilesByRoomID(data);
  }

  @MessagePattern("file.delete")
  async deleteFiles(@Payload() data: { fileIds: string[] }) {
    return this.fileService.deleteFiles(data);
  }

  @MessagePattern("file.update")
  async updateFile(@Payload() data: UpdateFileDto) {
    return this.fileService.updateFile(data);
  }

  // Upload operations
  @MessagePattern("file.initUpload")
  async uploadFileToRoom(@Payload() data: UploadData) {
    return this.uploadService.initUploads(data);
  }

  @MessagePattern("file.confirmUpload")
  async uploadFileToStorage(@Payload() data: UploadConfirmDto) {
    return this.uploadService.confirmUpload(data);
  }

  // Download operations
  @MessagePattern("file.getDownloadLink")
  async getDownloadLink(
    @Payload() data: { fileIds: string[]; userId: number }
  ) {
    return this.downloadService.getDownloadLinksAuthenticated(data);
  }

  @MessagePattern("file.getDownloadLinkByToken")
  async getDownloadLinkByToken(@Payload() data: { downloadToken: string }) {
    return this.downloadService.downloadFileByToken(data);
  }

  @MessagePattern("file.getStream")
  async getStream(@Payload() data: { key: string }) {
    return this.downloadService.getStream(data.key);
  }

  // Multipart upload
  @MessagePattern("file.multipart.init")
  async initMultipart(
    @Payload() data: UploadInitMultipartDto & { ip?: string }
  ) {
    const { ip, ...params } = data;
    return this.multipartUploadService.initUploadMultipart(params, ip || "");
  }

  @MessagePattern("file.multipart.complete")
  async completeMultipart(@Payload() data: any) {
    return this.multipartUploadService.completeMultipart(data);
  }

  @MessagePattern("file.getExpired")
  async getExpiredFiles(@Payload() data: { beforeDate?: Date }) {
    return this.fileService.getExpiredFiles(data.beforeDate);
  }

  @MessagePattern("file.deleteCompletely")
  async deleteFileCompletely(
    @Payload() data: { fileIds: string[]; roomId?: string }
  ) {
    await this.fileService.deleteFilesCompletely(data.fileIds, data.roomId);
    return { success: true };
  }

  @MessagePattern("file.search")
  async searchFiles(
    @Payload()
    data: {
      roomIds: string[];
      query?: string;
      mimeType?: string;
      creatorId?: number;
      limit?: number;
      offset?: number;
    }
  ) {
    return this.fileService.searchFiles(data);
  }

  // Preview operations
  @MessagePattern("file.getPreviewUrl")
  async getPreviewUrl(@Payload() data: { fileId: string; userId: number }) {
    return this.previewService.getPreviewUrl(data);
  }

  @MessagePattern("file.getVideoThumbnailUrl")
  async getVideoThumbnailUrl(
    @Payload() data: { fileId: string; userId: number }
  ) {
    return this.previewService.getVideoThumbnailUrl(data);
  }

  @MessagePattern("file.getVideoStreamUrl")
  async getVideoStreamUrl(@Payload() data: { fileId: string; userId: number }) {
    return this.previewService.getVideoStreamUrl(data);
  }

  @MessagePattern("file.archiveRoom")
  async archiveRoom(
    @Payload()
    data: {
      roomId: string;
      storageId: string;
      parentId: string | null;
      userId: number;
      fileIds?: string[];
    }
  ) {
    return this.fileService.archiveRoom(data);
  }
}
