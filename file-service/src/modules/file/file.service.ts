import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Inject,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { File, FileDocument } from "./schemas/file.schema";
import { Room, RoomDocument } from "../room/schemas/room.schema";
import { CreateFileMetaDto } from "./dto/create-file-meta.dto";
import { DeleteFileDto } from "./dto/delete-file.dto";
import { FileUploadStatus } from "../../constants/interfaces";
import {
  PermissionClientService,
  AccessRole,
  ResourceType,
} from "../permission-client/permission-client.service";
import { S3Service } from "../s3/s3.service";
import { S3_BUCKET_TOKEN } from "../s3/s3.tokens";
import { CacheService } from "../../cache/cache.service";
import { z } from "zod";

interface AuthenticatedGettingFilesByRoomParams {
  roomId: string;
  userId: number;
}

const fileMetaSchema = z.object({
  _id: z.any(),
  originalName: z.string(),
  key: z.string(),
  storedName: z.string(),
  size: z.number(),
  mimeType: z.string(),
  uploadTime: z.any(),
  downloadCount: z.number(),
  uploadedParts: z.number(),
  uploaderIp: z.string().optional(),
  expiresAt: z.any().nullable(),
  uploadSession: z.object({
    uploadId: z.string().optional(),
    status: z.string(),
  }),
  creatorId: z.number().optional(),
});

const roomFilesSchema = z.object({
  _id: z.any(),
  files: z.array(fileMetaSchema),
  createdAt: z.any(),
  expiresAt: z.any().optional(),
});

@Injectable()
export class FileService {
  private readonly FILE_META_TTL = 300; // 5 минут
  private readonly ROOM_FILES_TTL = 120; // 2 минуты

  constructor(
    private readonly permissionClient: PermissionClientService,
    @InjectModel(File.name) private readonly fileModel: Model<FileDocument>,
    @InjectModel(Room.name) private readonly roomModel: Model<RoomDocument>,
    private readonly s3Service: S3Service,
    private readonly cacheService: CacheService,
    @Inject(S3_BUCKET_TOKEN) private readonly bucket: string
  ) {}

  async createFileMeta(dto: CreateFileMetaDto) {
    const expiresAt =
      dto.expiresAt !== undefined
        ? dto.expiresAt
        : new Date(Date.now() + 24 * 60 * 60 * 1000);

    const fileDoc = new this.fileModel({
      ...dto,
      uploadTime: new Date(),
      downloadCount: 0,
      expiresAt,
    });

    return fileDoc.save();
  }

  async invalidateRoomCache(roomId: string): Promise<void> {
    await this.cacheService.delete(`room:files:${roomId}`);
  }

  async deleteFiles(dto: DeleteFileDto) {
    if (!dto.fileIds || dto.fileIds.length === 0) {
      throw new BadRequestException("No files provided");
    }

    const updatedFiles = await Promise.all(
      dto.fileIds.map((fileId) => this.expireFile(fileId))
    );
    return updatedFiles.filter(Boolean);
  }

  private async expireFile(fileId: string) {
    try {
      return await this.fileModel
        .findByIdAndUpdate(
          fileId,
          { $set: { expiresAt: new Date() } },
          { new: true }
        )
        .exec();
    } catch (err) {
      console.error(`Failed to expire file ${fileId}`, err);
      return null;
    }
  }

  async getFilesByRoomID(params: AuthenticatedGettingFilesByRoomParams) {
    if (!params.roomId) {
      throw new BadRequestException("No roomId provided");
    }

    const cacheKey = `room:files:${params.roomId}`;

    return this.cacheService.cacheWrapper(
      cacheKey,
      async () => {
        const room = await this.roomModel
          .findById(params.roomId)
          .populate<{ files: FileDocument[] }>({
            path: "files",
            select: "-__v-",
            options: { lean: true },
          })
          .exec();

        if (!room) {
          throw new NotFoundException("Room hasn't been found");
        }

        room.files = room.files.filter(
          (file) => !file.expiresAt || file.expiresAt > new Date()
        );

        return room;
      },
      roomFilesSchema,
      this.ROOM_FILES_TTL,
    );
  }

  async getFileById(fileId: string) {
    const cacheKey = `file:meta:${fileId}`;

    return this.cacheService.cacheWrapper(
      cacheKey,
      async () => {
        const fileDoc = await this.fileModel.findById(fileId).lean();

        if (!fileDoc) {
          throw new NotFoundException({ error: "File does not exist" });
        }

        if (fileDoc.expiresAt && fileDoc.expiresAt <= new Date()) {
          throw new NotFoundException({ error: "File has expired" });
        }

        if (fileDoc.uploadSession.status !== FileUploadStatus.COMPLETE) {
          throw new BadRequestException({ error: "File upload not completed" });
        }

        return fileDoc;
      },
      fileMetaSchema,
      this.FILE_META_TTL,
    );
  }

  async getFileByUploadId(uploadId: string) {
    const fileDoc = await this.fileModel
      .findOne({ "uploadSession.uploadId": uploadId })
      .lean();

    if (!fileDoc) {
      throw new NotFoundException({ error: "File doc does not exist" });
    }

    if (fileDoc.expiresAt && fileDoc.expiresAt <= new Date()) {
      throw new NotFoundException({ error: "File has expired" });
    }
    if (fileDoc.uploadSession.status !== FileUploadStatus.COMPLETE) {
      throw new BadRequestException({ error: "File upload not completed" });
    }

    return fileDoc;
  }

  async getExpiredFiles(beforeDate?: Date) {
    const date = beforeDate || new Date();
    return this.fileModel
      .find({
        expiresAt: { $lte: date, $ne: null },
      })
      .lean()
      .exec();
  }

  async deleteFileCompletely(storedName: string): Promise<void> {
    const file = await this.fileModel.findOne({ storedName }).exec();

    if (!file) {
      console.warn(`File with storedName ${storedName} not found in database`);
      await this.deleteFromS3(storedName);
      return;
    }

    const fileId = (file._id as any).toString();

    let roomId: string | null = null;
    try {
      const room = await this.roomModel.findOne({ files: fileId }).exec();
      if (room) {
        roomId = (room._id as any).toString();
      }
    } catch (err) {
      console.error(`Error finding room for file: ${fileId}`, err);
    }

    try {
      await this.deleteFromS3(storedName);
      console.log(`File deleted from S3: ${storedName}`);
    } catch (err) {
      console.error(`Error deleting file from S3: ${storedName}`, err);
    }

    try {
      await this.cacheService.delete(`file:meta:${fileId}`);
      await this.cacheService.delete(`download:url:${file.key}`);
      if (roomId) {
        await this.cacheService.delete(`room:files:${roomId}`);
      }
    } catch (err) {
      console.error(`Error invalidating cache for file ${fileId}`, err);
    }

    if (roomId) {
      try {
        await this.roomModel
          .findByIdAndUpdate(roomId, { $pull: { files: fileId } })
          .exec();
        console.log(`File removed from room ${roomId}: ${fileId}`);
      } catch (err) {
        console.error(
          `Error removing file from room ${roomId}: ${fileId}`,
          err
        );
      }
    }

    try {
      await this.fileModel.findByIdAndDelete(fileId).exec();
      console.log(`File deleted from database: ${fileId}`);
    } catch (err) {
      console.error(`Error deleting file from database: ${fileId}`, err);
      throw err;
    }
  }

  private async deleteFromS3(key: string): Promise<void> {
    try {
      await this.s3Service.delete({
        Bucket: this.bucket,
        Key: key,
      });
    } catch (err) {
      console.error(`Failed to delete file from S3: ${key}`, err);
      throw err;
    }
  }

  async searchFiles(params: {
    roomIds: string[];
    query?: string;
    mimeType?: string;
    creatorId?: number;
    limit?: number;
    offset?: number;
  }) {

    const { roomIds, query, mimeType, creatorId, limit = 50, offset = 0 } = params;

    if (roomIds.length === 0) {
      return [];
    }

    const rooms = await this.roomModel
      .find({ _id: { $in: roomIds } })
      .populate<{ files: FileDocument[] }>({
        path: 'files',
        select: '-__v',
        options: { lean: true },
      })
      .lean()
      .exec();

    const allFiles: Array<{
      _id: string;
      originalName: string;
      mimeType: string;
      size: number;
      creatorId?: number;
      roomId: string;
    }> = [];

    for (const room of rooms) {
      if (room.files && Array.isArray(room.files)) {
        for (const file of room.files) {
          if (file.expiresAt && file.expiresAt <= new Date()) {
            continue;
          }

          if (file.uploadSession?.status !== FileUploadStatus.COMPLETE) {
            continue;
          }

          if (query && !file.originalName.toLowerCase().includes(query.toLowerCase())) {
            continue;
          }

          if (mimeType && file.mimeType !== mimeType) {
            continue;
          }

          if (creatorId !== undefined && file.creatorId !== creatorId) {
            continue;
          }

          allFiles.push({
            _id: String(file._id),
            originalName: file.originalName,
            mimeType: file.mimeType,
            size: file.size,
            creatorId: file.creatorId,
            roomId: room._id.toString(),
          });
        }
      }
    }

    const paginatedFiles = allFiles.slice(offset, offset + limit);

    return paginatedFiles;
  }
}
