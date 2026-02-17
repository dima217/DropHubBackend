import { BadRequestException, forwardRef, NotFoundException } from "@nestjs/common";
import { Room, RoomDocument } from "../../room/schemas/room.schema";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { FileDocument } from "@/modules/file/schemas/file.schema";
import { Inject } from "@nestjs/common";
import { FILE_SERVICE_TOKEN, type IFileService } from "@/modules/file/interfaces";
import type { IStorageService } from "@/modules/storage/interfaces";
import { STORAGE_SERVICE_TOKEN } from "@/modules/storage/interfaces";

export class ArchiveRoomService {
  constructor(
    @InjectModel(Room.name) private readonly roomModel: Model<RoomDocument>,
    @Inject(forwardRef(() => STORAGE_SERVICE_TOKEN))
    private readonly storageService: IStorageService,
    @Inject(forwardRef(() => FILE_SERVICE_TOKEN)) 
    private readonly fileService: IFileService,
  ) {}

  async archiveRoom(params: {
    roomId: string;
    storageId: string;
    parentId: string | null;
    userId: number;
    fileIds?: string[];
  }) {
    const { roomId, storageId, parentId, userId, fileIds } = params;

    const room = await this.roomModel
      .findById(roomId)
      .populate<{ files: FileDocument[] }>({
        path: "files",
        select: "-__v",
        options: { lean: true },
      })
      .exec();

    if (!room) {
      throw new NotFoundException("Room not found.");
    }

    if (room.archived) {
      throw new BadRequestException("Room is already archived.");
    }

    let filesToArchive = room.files || [];
    if (fileIds && fileIds.length > 0) {
      filesToArchive = filesToArchive.filter((file) =>
        fileIds.includes(String(file._id))
      );
    }

    filesToArchive = filesToArchive.filter(
      (file) =>
        (!file.expiresAt || file.expiresAt > new Date())
    );

    if (filesToArchive.length === 0) {
      throw new BadRequestException("No valid files to archive.");
    }
    const roomFolderName = `Room ${roomId.substring(0, 8)}`;

    const folderItem = await this.storageService.createItemInStorage({
      storageId,
      userId,
      name: roomFolderName,
      isDirectory: true,
      parentId,
      fileId: null,
    });

    const copiedFiles: { fileId: string }[] = await Promise.all(
      filesToArchive.map((file) =>
        this.fileService.copyFile({
          sourceFileId: String(file._id),
          userId: userId.toString(),
        })
      )
    );

    const folderId = String(folderItem._id);

    const archivedItems = await Promise.all(
      copiedFiles.map((file) =>
        this.storageService.createItemInStorage({
          storageId,
          userId,
          name: new Date().getTime().toString(),
          isDirectory: false,
          parentId: folderId,
          fileId: file.fileId,
        })
      )
    );

    await this.roomModel.findByIdAndUpdate(roomId, {
      $set: {
        archived: true,
        archivedAt: new Date(),
      },
    });

    return {
      success: true,
      roomId,
      folderId,
      archivedFilesCount: archivedItems.length,
    };
  }
}