import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { S3Service } from "../../../s3/s3.service";
import { S3_BUCKET_TOKEN } from "../../../s3/s3.tokens";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { IStorageService } from "../../../storage/interfaces";
import { STORAGE_SERVICE_TOKEN } from "../../../storage/interfaces";
import type { IRoomService } from "../../../room/interfaces";
import { ROOM_SERVICE_TOKEN } from "../../../room/interfaces";
import {
  PermissionClientService,
  AccessRole,
  ResourceType,
} from "../../../permission-client/permission-client.service";
import { TokenClientService } from "../../../token-client/token-client.service";
import { UploadData } from "../../interfaces/file-request.interface";
import type { IUploadService, IFileService } from "../../interfaces";
import { FILE_SERVICE_TOKEN } from "../../interfaces";

@Injectable()
export class UploadService implements IUploadService {
  constructor(
    private readonly s3Service: S3Service,
    @Inject(ROOM_SERVICE_TOKEN) private readonly roomService: IRoomService,
    @Inject(STORAGE_SERVICE_TOKEN) private readonly storageService: IStorageService,
    private readonly permissionClient: PermissionClientService,
    @Inject(FILE_SERVICE_TOKEN) private readonly fileService: IFileService,
    private readonly tokenService: TokenClientService,
    @Inject(S3_BUCKET_TOKEN) private readonly bucket: string
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

  async uploadFileToRoom(params: UploadData) {
    const { fileSize, mimeType, uploaderIp, originalName, userId, roomId } =
      params;
    const resourceId = roomId;
    const resourceType = ResourceType.ROOM;

    if (!fileSize || !resourceId || !resourceType || !userId) {
      throw new BadRequestException({
        error: "Missing file details or user ID",
      });
    }

    // Permission check is performed in main-app before calling this service

    const room = await this.roomService.getRoomById(resourceId);
    const fileExpiresAt = room?.expiresAt
      ? new Date(Date.now() + 24 * 60 * 60 * 1000)
      : null;

    const { url, key } = await this.getPresignedUrl(originalName, mimeType);

    const fileUploadMeta = await this.fileService.createFileMeta({
      originalName: originalName,
      key: key,
      size: fileSize,
      mimeType: mimeType,
      uploaderIp,
      expiresAt: fileExpiresAt,
      creatorId: userId,
    });

    await this.roomService.bindFileToRoom(
      resourceId,
      fileUploadMeta._id.toString()
    );

    // Инвалидация кеша комнаты при добавлении файла
    await this.fileService.invalidateRoomCache(resourceId);

    return { url };
  }

  async uploadFileToStorage(params: UploadData) {
    const { fileSize, mimeType, uploaderIp, originalName, userId, storageId } =
      params;
    const resourceId = storageId;
    const resourceType = ResourceType.STORAGE;

    if (!fileSize || !resourceId || !resourceType || !userId) {
      throw new BadRequestException({
        error: "Missing file details or user ID",
      });
    }

    // Permission check is performed in main-app before calling this service

    const { url, key } = await this.getPresignedUrl(originalName, mimeType);

    const fileUploadMeta = await this.fileService.createFileMeta({
      originalName,
      key,
      size: fileSize,
      mimeType,
      uploaderIp,
      expiresAt: null,
      creatorId: userId,
    });

    await this.storageService.createItemInStorage({
      storageId: resourceId,
      userId,
      name: originalName,
      isDirectory: false,
      parentId: null,
      fileId: fileUploadMeta._id.toString(),
    });

    return { url };
  }

  async uploadFileByToken(params: UploadData) {
    const { uploadToken } = params;

    if (!uploadToken) {
      throw new BadRequestException("Upload token is required.");
    }

    const payload = await this.tokenService.validateToken(uploadToken);

    if (!payload || !payload.resourceId || !payload.resourceType) {
      throw new UnauthorizedException("Invalid or expired upload token.");
    }

    const targetParams: UploadData = {
      ...params,
      roomId: payload.resourceType === "room" ? payload.resourceId : undefined,
      storageId:
        payload.resourceType === "storage" ? payload.resourceId : undefined,
    };

    if (targetParams.roomId) {
      return this.uploadFileToRoom(targetParams);
    } else if (targetParams.storageId) {
      return this.uploadFileToStorage(targetParams);
    } else {
      throw new BadRequestException(
        "Token target is not supported for single upload."
      );
    }
  }
}
