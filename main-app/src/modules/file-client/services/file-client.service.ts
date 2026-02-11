import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  CreateFileMetaPayload,
  FileMeta,
  RoomWithFiles,
  UploadByTokenPayload,
  InitMultipartResult,
  SuccessResponse,
  RoomFileUpdateResponse,
} from '../types/file';
import { UploadInitMultipartDto } from '@application/file/dto/upload/multipart/upload-init-multipart.dto';
import { UploadCompleteDto } from '@application/file/dto/upload/upload-complete.dto';
import { UploadConfirmDto } from '@application/file/dto/upload/upload.confirm.dto';
import { UploadInitDto } from '@application/file/dto/upload/upload-init.dto';
import { UpdateFileDto } from '@application/file/dto/update-file.dto';

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

  async updateRoomFile(data: UpdateFileDto): Promise<RoomFileUpdateResponse> {
    return this.send<RoomFileUpdateResponse, UpdateFileDto>('file.update', data);
  }

  async deleteFiles(fileIds: string[], roomId: string): Promise<{ success: boolean }> {
    return this.send<{ success: boolean }, { fileIds: string[]; roomId: string }>(
      'file.deleteCompletely',
      {
        fileIds,
        roomId,
      },
    );
  }

  async initUpload(data: UploadInitDto): Promise<{ uploadId: string; uploadUrl: string }[]> {
    return this.send<{ uploadId: string; uploadUrl: string }[], UploadInitDto>(
      'file.initUpload',
      data,
    );
  }

  async confirmUpload(data: UploadConfirmDto): Promise<{ success: boolean; fileId: string }> {
    return this.send<{ success: boolean; fileId: string }, UploadConfirmDto>(
      'file.confirmUpload',
      data,
    );
  }

  async uploadFileByToken(data: UploadByTokenPayload): Promise<{ url: string }> {
    return this.send<{ url: string }, UploadByTokenPayload>('file.uploadByToken', data);
  }

  async getDownloadLinks(
    fileIds: string[],
    userId: number,
  ): Promise<{ fileId: string; url: string }[]> {
    return this.send<{ fileId: string; url: string }[], { fileIds: string[]; userId: number }>(
      'file.getDownloadLink',
      {
        fileIds,
        userId,
      },
    );
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

  async archiveRoom(payload: {
    roomId: string;
    storageId: string;
    parentId: string | null;
    userId: number;
    fileIds?: string[];
  }): Promise<{ success: boolean; roomId: string; folderId: string; archivedFilesCount: number }> {
    return this.send<
      { success: boolean; roomId: string; folderId: string; archivedFilesCount: number },
      typeof payload
    >('file.archiveRoom', payload);
  }
}
