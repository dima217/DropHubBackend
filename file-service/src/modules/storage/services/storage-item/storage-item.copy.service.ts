import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from "@nestjs/common";
import { Types } from "mongoose";
import { StorageItemRepository } from "./storage-item.repository";
import { StorageItem } from "../../schemas/storage.item.schema";
import { FILE_SERVICE_TOKEN, type IFileService } from "@/modules/file/interfaces";

@Injectable()
export class StorageItemCopyService {
  constructor(
    private readonly repo: StorageItemRepository,   
    @Inject(forwardRef(() => FILE_SERVICE_TOKEN))
    private readonly fileService: IFileService
  ) {}

  async copyItem(
    itemId: string,
    targetParentId: string | null,
    userId: string,
    storageId: string
  ): Promise<StorageItem> {
    const sourceItem = await this.repo.findById(itemId).lean();
    if (!sourceItem) {
      throw new NotFoundException("Source item not found.");
    }

    if (sourceItem.deletedAt) {
      throw new BadRequestException(
        "Cannot copy deleted item. Restore it first."
      );
    }

    if (sourceItem.storageId !== storageId) {
      throw new BadRequestException("Cannot copy item to another storage.");
    }

    if (targetParentId !== null) {
      const parent = await this.repo.findById(targetParentId);
      if (!parent) {
        throw new NotFoundException("Target folder not found.");
      }
      if (!parent.isDirectory) {
        throw new BadRequestException("Target must be a folder.");
      }
      if (parent.deletedAt) {
        throw new BadRequestException("Cannot copy to deleted folder.");
      }
      if (parent.storageId !== storageId) {
        throw new BadRequestException("Cannot copy to another storage.");
      }
    }

    const parentObjectId = targetParentId
      ? new Types.ObjectId(targetParentId)
      : null;

    const copyName = await this.generateUniqueName(
      sourceItem.name,
      parentObjectId,
      storageId,
      true
    );

    let newFileId: Types.ObjectId | undefined = undefined;

    if (!sourceItem.isDirectory && sourceItem.fileId) {
        const { fileId } = await this.fileService.copyFile({
        sourceFileId: sourceItem.fileId.toString(),
        userId,
      });

      newFileId = new Types.ObjectId(fileId);
    }

    const copiedRoot = await this.repo.create({
      userId,
      name: copyName,
      isDirectory: sourceItem.isDirectory,
      parentId: parentObjectId,
      fileId: newFileId,
      storageId,
      creatorId: sourceItem.creatorId || parseInt(userId, 10),
      tags: sourceItem.tags ? [...sourceItem.tags] : [],
    });

    if (sourceItem.isDirectory) {
      await this.copyChildrenRecursive(
        sourceItem._id,
        copiedRoot._id,
        userId,
        storageId
      );
    }

    return copiedRoot;
  }

  private async copyChildrenRecursive(
    sourceParentId: Types.ObjectId,
    targetParentId: Types.ObjectId,
    userId: string,
    storageId: string
  ): Promise<void> {
    const children = await this.repo.findLean({
      parentId: sourceParentId,
      deletedAt: null,
    });

    for (const child of children) {
      const childName = await this.generateUniqueName(
        child.name,
        targetParentId,
        storageId,
        false
      );

      let newFileId: Types.ObjectId | undefined;

      if (!child.isDirectory && child.fileId) {
          const { fileId } = await this.fileService.copyFile({
          sourceFileId: child.fileId.toString(),
          userId,
        });

        newFileId = new Types.ObjectId(fileId);
      }

      const copiedChild = await this.repo.create({
        userId,
        name: childName,
        isDirectory: child.isDirectory,
        parentId: targetParentId,
        fileId: newFileId,
        storageId,
        creatorId: child.creatorId || parseInt(userId, 10),
        tags: child.tags ? [...child.tags] : [],
      });

      if (child.isDirectory) {
        await this.copyChildrenRecursive(
          child._id,
          copiedChild._id,
          userId,
          storageId
        );
      }
    }
  }

  private async generateUniqueName(
    baseName: string,
    parentId: Types.ObjectId | null,
    storageId: string,
    isRootCopy: boolean
  ): Promise<string> {
    let name = isRootCopy ? `${baseName} (copy)` : baseName;
    let counter = 1;

    while (
      await this.repo.findOne({
        parentId,
        name,
        storageId,
        deletedAt: null,
      })
    ) {
      name = isRootCopy
        ? `${baseName} (copy ${counter})`
        : `${baseName} (${counter})`;
      counter++;
    }

    return name;
  }
}
