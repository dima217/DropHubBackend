import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { S3Service } from '../../../s3/s3.service';
import { GetObjectCommandInput, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3_BUCKET_TOKEN } from '../../../s3/s3.tokens';
import { CacheService } from '../../../../cache/cache.service';
import { FileUploadStatus } from '../../../../constants/interfaces';
import { z } from 'zod';
import type {
  IPreviewService,
  PreviewParams,
  IFileService,
} from '../../interfaces';
import { FILE_SERVICE_TOKEN } from '../../interfaces';

@Injectable()
export class PreviewService implements IPreviewService {
  private readonly presignedUrlTTL = 300; // 5 minutes for preview
  private readonly cacheTTL = 290; // seconds (less than presigned URL TTL)
  private readonly urlSchema = z.string().url();

  constructor(
    private readonly s3Service: S3Service,
    @Inject(FILE_SERVICE_TOKEN) private readonly fileService: IFileService,
    private readonly cacheService: CacheService,
    @Inject(S3_BUCKET_TOKEN) private readonly bucket: string,
  ) {}

  private async generatePreviewUrl(
    key: string,
    mimeType: string,
    isVideo: boolean = false,
  ): Promise<string> {
    const cacheKey = `preview:url:${key}:${isVideo ? 'video' : 'image'}`;

    return this.cacheService.cacheWrapper(
      cacheKey,
      async () => {
        const previewData: GetObjectCommandInput = {
          Bucket: this.bucket,
          Key: key,
          ResponseContentType: mimeType,
          // Не устанавливаем Content-Disposition, чтобы браузер мог отобразить файл
        };

        const command = this.s3Service.createGetResourceCommand(previewData);
        const url = await getSignedUrl(this.s3Service.client, command, {
          expiresIn: this.presignedUrlTTL,
        });
        return url;
      },
      this.urlSchema,
      this.cacheTTL,
    );
  }

  private async generateVideoStreamUrl(
    key: string,
    mimeType: string,
  ): Promise<{ url: string; size: number }> {
    const cacheKey = `preview:video:stream:${key}`;

    return this.cacheService.cacheWrapper(
      cacheKey,
      async () => {
        const headCommand = new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        });
        const headResult = await this.s3Service.client.send(headCommand);
        const fileSize = headResult.ContentLength ?? 0;

        // S3 presigned URLs автоматически поддерживают Range заголовки
        const streamData: GetObjectCommandInput = {
          Bucket: this.bucket,
          Key: key,
          ResponseContentType: mimeType,
          // ResponseContentDisposition не устанавливаем, чтобы браузер мог стримить
          // Range requests будут работать через HTTP заголовок Range: bytes=start-end
        };

        const command = this.s3Service.createGetResourceCommand(streamData);
        const url = await getSignedUrl(this.s3Service.client, command, {
          expiresIn: this.presignedUrlTTL,
        });

        return { url, size: fileSize };
      },
      z.object({
        url: z.string().url(),
        size: z.number(),
      }),
      this.cacheTTL,
    );
  }

  private isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  private isVideo(mimeType: string): boolean {
    return mimeType.startsWith('video/');
  }

  private async verifyAndGetFile(fileId: string) {
    const file = await this.fileService.getFileById(fileId);
    if (!file) {
      throw new NotFoundException('File does not exist.');
    }

    if (file.expiresAt && file.expiresAt <= new Date()) {
      throw new NotFoundException('File has expired.');
    }

    if (file.uploadSession.status !== FileUploadStatus.COMPLETE) {
      throw new BadRequestException('File upload not completed.');
    }

    return file;
  }

  async getPreviewUrl(
    params: PreviewParams,
  ): Promise<
    | { previewUrl: string; type: 'image' }
    | { previewUrl: string; type: 'video'; size: number }
  > {
    const { fileId } = params;

    const file = await this.verifyAndGetFile(fileId);

    if (this.isImage(file.mimeType)) {
      const previewUrl = await this.generatePreviewUrl(file.key, file.mimeType, false);
      return { previewUrl, type: 'image' };
    }

    if (this.isVideo(file.mimeType)) {
      const { url, size } = await this.generateVideoStreamUrl(file.key, file.mimeType);
      return { previewUrl: url, type: 'video', size };
    }

    throw new BadRequestException('Preview is only available for images and videos.');
  }

  async getVideoThumbnailUrl(params: PreviewParams): Promise<{ thumbnailUrl: string }> {
    const { fileId } = params;

    const file = await this.verifyAndGetFile(fileId);

    if (!this.isVideo(file.mimeType)) {
      throw new BadRequestException('Thumbnail is only available for videos.');
    }

    const thumbnailUrl = await this.generatePreviewUrl(file.key, file.mimeType, true);
    return { thumbnailUrl };
  }

  async getVideoStreamUrl(
    params: PreviewParams,
  ): Promise<{ streamUrl: string; size: number }> {
    const { fileId } = params;

    const file = await this.verifyAndGetFile(fileId);

    if (!this.isVideo(file.mimeType)) {
      throw new BadRequestException('Stream URL is only available for videos.');
    }

    const { url, size } = await this.generateVideoStreamUrl(file.key, file.mimeType);
    return { streamUrl: url, size };
  }

  async invalidatePreviewCache(key: string): Promise<void> {
    await this.cacheService.delete(`preview:url:${key}:image`);
    await this.cacheService.delete(`preview:url:${key}:video`);
    await this.cacheService.delete(`preview:video:stream:${key}`);
  }
}

