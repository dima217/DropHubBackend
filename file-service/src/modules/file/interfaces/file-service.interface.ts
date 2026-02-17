import { FileDocument } from "../schemas/file.schema";
import { RoomDocument } from "../../room/schemas/room.schema";
import { CreateFileMetaDto } from "../dto/create-file-meta.dto";
import { DeleteFileDto } from "../dto/delete-file.dto";
import { UpdateFileDto } from "../dto/update-file.dto";

export interface AuthenticatedGettingFilesByRoomParams {
  roomId: string;
  userId: number;
}

export type FileMeta = {
  _id: any;
  originalName: string;
  key: string;
  storedName: string;
  size: number;
  mimeType: string;
  uploadTime: any;
  downloadCount: number;
  uploadedParts: number;
  uploaderIp?: string;
  expiresAt: any;
  uploadSession: {
    uploadId?: string;
    status: string;
  };
  creatorId?: number;
};

export type RoomWithFiles = {
  _id: any;
  files: FileMeta[];
  createdAt: any;
  expiresAt?: any;
};

export interface IFileService {
  createFileMeta(dto: CreateFileMetaDto): Promise<FileDocument>;
  copyFile(params: {
    sourceFileId: string;
    userId: string;
  }): Promise<{ fileId: string }>;
  updateFile(dto: UpdateFileDto): Promise<{ success: boolean; roomId: string }>;
  invalidateRoomCache(roomId: string): Promise<void>;
  deleteFiles(dto: DeleteFileDto): Promise<(FileDocument | null)[]>;
  getFilesByRoomID(
    params: AuthenticatedGettingFilesByRoomParams
  ): Promise<RoomWithFiles>;
  getFileById(fileId: string): Promise<FileMeta>;
  getFileByUploadId(uploadId: string): Promise<any>;
  getExpiredFiles(beforeDate?: Date): Promise<any[]>;
  deleteFilesCompletely(fileIds: string[], roomId?: string): Promise<void>;
  searchFiles(params: {
    roomIds: string[];
    query?: string;
    mimeType?: string;
    mimeTypes?: string[];
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
  >;
}
