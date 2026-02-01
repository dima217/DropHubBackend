import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { Inject } from "@nestjs/common";
import { S3Service } from "../../../s3/s3.service";
import { GetObjectCommandInput } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3_BUCKET_TOKEN } from "../../../s3/s3.tokens";
import {
  PermissionClientService,
  AccessRole,
  ResourceType,
} from "../../../permission-client/permission-client.service";
import { TokenClientService } from "../../../token-client/token-client.service";
import { Readable } from "stream";
import { S3ReadStream } from "../../utils/s3-read-stream";
import { CacheService } from "../../../../cache/cache.service";
import { z } from "zod";
import type { IDownloadService, IFileService } from "../../interfaces";
import { FILE_SERVICE_TOKEN } from "../../interfaces";

interface AuthenticatedDownloadParams {
  fileId: string;
  userId: number;
}

interface DownloadByTokenParams {
  downloadToken: string;
}

@Injectable()
export class DownloadService implements IDownloadService {
  private readonly presignedUrlTTL = 60; // seconds
  private readonly cacheTTL = 50; // seconds (less than presigned URL TTL to avoid expired URLs)
  private readonly urlSchema = z.string().url();

  constructor(
    private readonly s3Service: S3Service,
    private readonly permissionClient: PermissionClientService,
    private readonly tokenService: TokenClientService,
    @Inject(FILE_SERVICE_TOKEN) private readonly fileService: IFileService,
    private readonly s3ReadStream: S3ReadStream,
    private readonly cacheService: CacheService,
    @Inject(S3_BUCKET_TOKEN) private readonly bucket: string
  ) {}

  private async generatePresignedUrl(
    key: string,
    fileId?: string
  ): Promise<string> {
    const cacheKey = `download:url:${key}`;

    return this.cacheService.cacheWrapper(
      cacheKey,
      async () => {
        const downloadData: GetObjectCommandInput = {
          Bucket: this.bucket,
          Key: key,
        };
        const command = this.s3Service.createGetResourceCommand(downloadData);
        const url = await getSignedUrl(this.s3Service.client, command, {
          expiresIn: this.presignedUrlTTL,
        });
        return url;
      },
      this.urlSchema,
      this.cacheTTL
    );
  }

  // Метод для инвалидации кеша при удалении файла
  async invalidateDownloadCache(key: string): Promise<void> {
    await this.cacheService.delete(`download:url:${key}`);
  }

  private async verifyAndGetFile(fileId: string, userId?: number) {
    const file = await this.fileService.getFileById(fileId);
    if (!file) {
      throw new NotFoundException("File does not exist.");
    }
    // Permission check is performed in main-app before calling this service
    // userId is kept for potential future use or logging

    return file;
  }

  async getDownloadLinkAuthenticated(
    params: AuthenticatedDownloadParams
  ): Promise<string> {
    const { fileId, userId } = params;

    const file = await this.verifyAndGetFile(fileId, userId);

    return this.generatePresignedUrl(file.key, fileId);
  }

  async downloadFileByToken(params: DownloadByTokenParams): Promise<string> {
    const { downloadToken } = params;

    if (!downloadToken) {
      throw new BadRequestException("Download token is required.");
    }

    const payload = await this.tokenService.validateToken(downloadToken);

    if (!payload || !payload.resourceId || payload.resourceType !== "file") {
      throw new UnauthorizedException("Invalid or expired download token.");
    }

    const fileId = payload.resourceId;
    const file = await this.verifyAndGetFile(fileId);

    return this.generatePresignedUrl(file.key, fileId);
  }

  async getStream(key: string): Promise<Readable> {
    if (!key) {
      throw new BadRequestException("S3 key is required");
    }

    return this.s3ReadStream.download(key);
  }
}
