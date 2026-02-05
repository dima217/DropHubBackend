import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Types } from "mongoose";
import { StorageItemRepository } from "./storage-item.repository";
import { StorageItemLean } from "../../interfaces/types/storage-item.lean";
import { StorageItem } from "../../schemas/storage.item.schema";

@Injectable()
export class StorageItemTreeService {
  constructor(private readonly repo: StorageItemRepository) {}

  async getChildren(
    parentId: string | null,
    storageId?: string
  ): Promise<StorageItemLean[]> {
    const query: any = { deletedAt: null };

    if (parentId === null) {
      query.parentId = null;
      if (storageId) query.storageId = storageId;
    } else {
      query.parentId = new Types.ObjectId(parentId);
    }

    return this.repo.findLean(query);
  }

  async getChildrenIdsRecursively(
    parentId: Types.ObjectId
  ): Promise<Types.ObjectId[]> {
    const children = await this.repo.findLean({ parentId });

    let ids: Types.ObjectId[] = [];

    for (const child of children) {
      ids.push(child._id);
      if (child.isDirectory) {
        ids = ids.concat(await this.getChildrenIdsRecursively(child._id));
      }
    }
    return ids;
  }

  async getChildrenCount(
    itemId: string
  ): Promise<{ total: number; files: number; folders: number }> {
    const children = await this.repo.findLean({
      parentId: new Types.ObjectId(itemId),
      deletedAt: null,
    });

    const total = children.length;
    const files = children.filter((child) => !child.isDirectory).length;
    const folders = children.filter((child) => child.isDirectory).length;

    return { total, files, folders };
  }

  async getAllItemsByStorageId(storageId: string): Promise<StorageItemLean[]> {
    return this.repo.findLean({ storageId, deletedAt: null });
  }

  async moveItem(
    itemId: string,
    newParentId: string | null
  ): Promise<StorageItem> {
    const item = await this.repo.findById(itemId);
    if (!item) {
      throw new NotFoundException("Item not found.");
    }

    if (item.deletedAt) {
      throw new BadRequestException(
        "Cannot move deleted item. Restore it first."
      );
    }

    if (
      String(item.parentId) === String(newParentId) ||
      (item.parentId === null && newParentId === null)
    ) {
      return item;
    }

    if (item.isDirectory && itemId === newParentId) {
      throw new BadRequestException("Cannot move folder into itself.");
    }

    if (newParentId !== null) {
      const parent = await this.repo.findById(newParentId);
      if (!parent) {
        throw new NotFoundException("Target folder not found.");
      }
      if (!parent.isDirectory) {
        throw new BadRequestException("Target must be a folder.");
      }
      if (parent.deletedAt) {
        throw new BadRequestException("Cannot move item to deleted folder.");
      }
      if (parent.storageId !== item.storageId) {
        throw new BadRequestException("Cannot move item to another storage.");
      }

      if (item.isDirectory) {
        let currentId: Types.ObjectId | null = parent._id;
        while (currentId) {
          if (currentId.toString() === itemId) {
            throw new BadRequestException(
              "Cannot move folder into its own subdirectory."
            );
          }
          const currentItem = await this.repo.findById(currentId);
          if (!currentItem || !currentItem.parentId) {
            currentId = null;
          } else {
            currentId = currentItem.parentId as Types.ObjectId;
          }
        }
      }
    }

    item.parentId = newParentId ? new Types.ObjectId(newParentId) : null;
    return item.save();
  }
}
