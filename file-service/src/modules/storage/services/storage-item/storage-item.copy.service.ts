import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Types } from "mongoose";
import { StorageItemRepository } from "./storage-item.repository";
import { StorageItem } from "../../schemas/storage.item.schema";

@Injectable()
export class StorageItemCopyService {
  constructor(private readonly repo: StorageItemRepository) {}

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

    const copiedRoot = await this.repo.create({
      userId,
      name: copyName,
      isDirectory: sourceItem.isDirectory,
      parentId: parentObjectId,
      fileId: sourceItem.fileId
        ? new Types.ObjectId(sourceItem.fileId)
        : undefined,
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

      const copiedChild = await this.repo.create({
        userId,
        name: childName,
        isDirectory: child.isDirectory,
        parentId: targetParentId,
        fileId: child.fileId ? new Types.ObjectId(child.fileId) : undefined,
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
