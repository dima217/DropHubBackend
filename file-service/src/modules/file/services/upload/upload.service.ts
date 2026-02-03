import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { S3Service } from "../../../s3/s3.service";
import { S3_BUCKET_TOKEN } from "../../../s3/s3.tokens";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { IStorageService } from "../../../storage/interfaces";
import { STORAGE_SERVICE_TOKEN } from "../../../storage/interfaces";
import type { IRoomService } from "../../../room/interfaces";
import { ROOM_SERVICE_TOKEN } from "../../../room/interfaces";
import { TokenClientService } from "../../../token-client/token-client.service";
import { UploadData } from "../../interfaces/file-request.interface";
import type { IUploadService, IFileService } from "../../interfaces";
import { FILE_SERVICE_TOKEN } from "../../interfaces";
import { UploadSessionRepository } from "../../repository/upload.session.repository";
import { UploadConfirmDto } from "../../dto/upload/upload-confirm.dto";
import { RpcException } from "@nestjs/microservices";

@Injectable()
export class UploadService implements IUploadService {
  constructor(
    private readonly s3Service: S3Service,
    @Inject(ROOM_SERVICE_TOKEN) private readonly roomService: IRoomService,
    @Inject(STORAGE_SERVICE_TOKEN)
    private readonly storageService: IStorageService,
    @Inject(FILE_SERVICE_TOKEN) private readonly fileService: IFileService,
    private readonly tokenService: TokenClientService,
    @Inject(S3_BUCKET_TOKEN) private readonly bucket: string,
    private readonly uploadSessionRepository: UploadSessionRepository
  ) {}

  private getMediaPrefix(mimeType: string): string {
    const base = "uploads";

    if (!mimeType) {
      return `${base}/other`;
    }

    if (mimeType.startsWith("image/")) {
      return `${base}/images`;
    }

    if (mimeType.startsWith("video/")) {
      return `${base}/videos`;
    }

    if (mimeType.startsWith("audio/")) {
      return `${base}/audio`;
    }

    if (
      mimeType.startsWith("application/pdf") ||
      mimeType.startsWith("application/msword") ||
      mimeType.startsWith("application/vnd") ||
      mimeType.startsWith("text/")
    ) {
      return `${base}/documents`;
    }

    return `${base}/other`;
  }

  private async getPresignedUrl(filename: string, contentType: string) {
    const prefix = this.getMediaPrefix(contentType);
    const sanitizedName = filename.replace(/\s+/g, "_");
    const key = `${prefix}/${Date.now()}-${sanitizedName}`;

    const url = await getSignedUrl(
      this.s3Service.client,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
      }),
      { expiresIn: 3600 }
    );

    return { url, key };
  }

  async initUploads(params: UploadData) {
    if (!params || !params.files.length) {
      throw new BadRequestException("No files provided for upload");
    }

    const results = await Promise.all(
      params.files.map(
        async ({ originalName, mimeType, fileSize, storeName }) => {
          if (!fileSize || !originalName || !params.userId) {
            throw new BadRequestException(
              "Invalid upload data for one of the files"
            );
          }

          const { url, key } = await this.getPresignedUrl(
            originalName,
            mimeType
          );

          const uploadMeta = await this.uploadSessionRepository.create({
            key,
            originalName,
            mimeType,
            size: fileSize,
            storedName: storeName,
            creatorId: params.userId,
            roomId: params.roomId,
            storageId: params.storageId,
          });

          return {
            uploadId: uploadMeta._id.toString(),
            uploadUrl: url,
          };
        }
      )
    );

    return results;
  }

  async confirmUpload(params: UploadConfirmDto) {
    try {
      const { uploadId, userId } = params;

      const uploadSession =
        await this.uploadSessionRepository.findById(uploadId);

      if (!uploadSession) {
        throw new BadRequestException("Upload session not found");
      }

      const exists = await this.s3Service.objectExists(
        this.bucket,
        uploadSession.key
      );

      if (!exists) {
        throw new RpcException({
          code: "FILE_NOT_UPLOADED",
          message: "File was not uploaded to S3",
        });
      }

      const fileMeta = await this.fileService.createFileMeta({
        originalName: uploadSession.originalName,
        key: uploadSession.key,
        size: uploadSession.size,
        storedName: uploadSession.storedName,
        mimeType: uploadSession.mimeType,
        creatorId: userId,
        expiresAt: null,
      });

      if (uploadSession.roomId) {
        await this.roomService.bindFileToRoom(
          uploadSession.roomId,
          fileMeta._id.toString()
        );

        await this.fileService.invalidateRoomCache(uploadSession.roomId);
      }

      if (uploadSession.storageId) {
        await this.storageService.createItemInStorage({
          storageId: uploadSession.storageId,
          userId,
          name: uploadSession.originalName,
          isDirectory: false,
          parentId: null,
          fileId: fileMeta._id.toString(),
        });
      }

      await this.uploadSessionRepository.deleteById(uploadId);

      return { success: true, fileId: fileMeta._id.toString() };
    } catch (err) {
      console.error("[confirmUpload] ERROR", err);
      throw err;
    }
  }
}
