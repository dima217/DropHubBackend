import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  CreateFileMetaPayload,
  FileMeta,
  RoomWithFiles,
  UploadToRoomPayload,
  UploadToStoragePayload,
  UploadByTokenPayload,
  InitMultipartResult,
  SuccessResponse,
} from '../types/file';
import { UploadInitMultipartDto } from '@application/file/dto/upload/upload-init-multipart.dto';
import { UploadCompleteDto } from '@application/file/dto/upload/upload-complete.dto';

@Injectable()
export class FileClientService {
  constructor(@Inject('FILE_SERVICE') private readonly fileClient: ClientProxy) {}

  private send<TResponse, TPayload = unknown>(
    pattern: string,
    payload: TPayload,
  ): Promise<TResponse> {
    return firstValueFrom(this.fileClient.send<TResponse, TPayload>(pattern, payload));
  }

  async createFileMeta(data: CreateFileMetaPayload): Promise<FileMeta> {
    return this.send<FileMeta, CreateFileMetaPayload>('file.create', data);
  }

  async getFileById(fileId: string): Promise<FileMeta> {
    return this.send<FileMeta, { fileId: string }>('file.getById', { fileId });
  }

  async getFileByUploadId(uploadId: string): Promise<FileMeta> {
    return this.send<FileMeta, { uploadId: string }>('file.getByUploadId', { uploadId });
  }

  async getFilesByRoom(roomId: string, userId: number): Promise<RoomWithFiles> {
    return this.send<RoomWithFiles, { roomId: string; userId: number }>('file.getByRoom', {
      roomId,
      userId,
    });
  }

  async deleteFiles(fileIds: string[]): Promise<FileMeta[]> {
    return this.send<FileMeta[], { fileIds: string[] }>('file.delete', { fileIds });
  }

  async uploadFileToRoom(data: UploadToRoomPayload): Promise<{ url: string }> {
    return this.send<{ url: string }, UploadToRoomPayload>('file.uploadToRoom', data);
  }

  async uploadFileToStorage(data: UploadToStoragePayload): Promise<{ url: string }> {
    return this.send<{ url: string }, UploadToStoragePayload>('file.uploadToStorage', data);
  }

  async uploadFileByToken(data: UploadByTokenPayload): Promise<{ url: string }> {
    return this.send<{ url: string }, UploadByTokenPayload>('file.uploadByToken', data);
  }

  async getDownloadLink(fileId: string, userId: number): Promise<string> {
    return this.send<string, { fileId: string; userId: number }>('file.getDownloadLink', {
      fileId,
      userId,
    });
  }

  async getDownloadLinkByToken(downloadToken: string): Promise<string> {
    return this.send<string, { downloadToken: string }>('file.getDownloadLinkByToken', {
      downloadToken,
    });
  }

  async getStream(key: string): Promise<unknown> {
    return this.send<unknown, { key: string }>('file.getStream', { key });
  }

  async initMultipartUpload(payload: UploadInitMultipartDto): Promise<InitMultipartResult> {
    return this.send<InitMultipartResult, UploadInitMultipartDto>('file.multipart.init', payload);
  }

  async completeMultipartUpload(data: UploadCompleteDto): Promise<SuccessResponse | void> {
    return this.send<SuccessResponse | void, UploadCompleteDto>('file.multipart.complete', data);
  }

  async getExpiredFiles(beforeDate?: Date): Promise<FileMeta[]> {
    return this.send<FileMeta[], { beforeDate?: Date }>('file.getExpired', { beforeDate });
  }

  async deleteFileCompletely(storedName: string): Promise<SuccessResponse> {
    return this.send<SuccessResponse, { storedName: string }>('file.deleteCompletely', {
      storedName,
    });
  }

  async searchFiles(payload: {
    roomIds: string[];
    query?: string;
    mimeType?: string;
    creatorId?: number;
    limit?: number;
    offset?: number;
  }): Promise<
    Array<{
      _id: string;
      originalName: string;
      mimeType: string;
      size: number;
      creatorId?: number;
      roomId: string;
    }>
  > {
    return this.send<
      Array<{
        _id: string;
        originalName: string;
        mimeType: string;
        size: number;
        creatorId?: number;
        roomId: string;
      }>,
      typeof payload
    >('file.search', payload);
  }

  async getPreviewUrl(
    fileId: string,
    userId: number,
  ): Promise<
    { previewUrl: string; type: 'image' } | { previewUrl: string; type: 'video'; size: number }
  > {
    return this.send<
      { previewUrl: string; type: 'image' } | { previewUrl: string; type: 'video'; size: number },
      { fileId: string; userId: number }
    >('file.getPreviewUrl', { fileId, userId });
  }

  async getVideoThumbnailUrl(fileId: string, userId: number): Promise<{ thumbnailUrl: string }> {
    return this.send<{ thumbnailUrl: string }, { fileId: string; userId: number }>(
      'file.getVideoThumbnailUrl',
      { fileId, userId },
    );
  }

  async getVideoStreamUrl(
    fileId: string,
    userId: number,
  ): Promise<{ streamUrl: string; size: number }> {
    return this.send<{ streamUrl: string; size: number }, { fileId: string; userId: number }>(
      'file.getVideoStreamUrl',
      { fileId, userId },
    );
  }
}
