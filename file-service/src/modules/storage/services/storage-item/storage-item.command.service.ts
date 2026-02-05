import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { Types } from "mongoose";
import { StorageItemRepository } from "./storage-item.repository";
import { StorageItem } from "../../schemas/storage.item.schema";

@Injectable()
export class StorageItemCommandService {
  constructor(private readonly repo: StorageItemRepository) {}

  async createItem(
    name: string,
    isDirectory: boolean,
    parentId: string | null,
    fileId: string | null,
    userId: string,
    storageId: string,
    creatorId?: number
  ): Promise<StorageItem> {
    const doc = await this.repo.create({
      userId,
      name,
      isDirectory,
      parentId: parentId ? new Types.ObjectId(parentId) : null,
      fileId: fileId ? new Types.ObjectId(fileId) : undefined,
      storageId,
      creatorId: creatorId ?? parseInt(userId, 10),
    });

    return doc;
  }

  async rename(itemId: string, newName: string) {
    if (!newName?.trim()) {
      throw new BadRequestException("Item name cannot be empty.");
    }

    const item = await this.repo.findById(itemId);
    if (!item) throw new NotFoundException("Item not found.");
    if (item.deletedAt) {
      throw new BadRequestException("Cannot rename deleted item. Restore it first.");
    }

    const existingItem = await this.repo.findOne({
      parentId: item.parentId,
      name: newName.trim(),
      storageId: item.storageId,
      deletedAt: null,
      _id: { $ne: item._id },
    });

    if (existingItem) {
      throw new BadRequestException(
        "An item with this name already exists in this folder."
      );
    }

    item.name = newName.trim();
    return item.save();
  }

  async updateTags(itemId: string, tags: string[]) {
    const item = await this.repo.updateById(itemId, { $set: { tags } });

    if (!item) throw new NotFoundException("Item not found.");
    return item;
  }
}
