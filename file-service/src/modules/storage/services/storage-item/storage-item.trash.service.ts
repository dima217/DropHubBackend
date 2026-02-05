import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Types } from "mongoose";
import { StorageItemRepository } from "./storage-item.repository";
import { StorageItemTreeService } from "./storage-item.tree.service";

@Injectable()
export class StorageItemTrashService {
  constructor(
    private readonly repo: StorageItemRepository,
    private readonly tree: StorageItemTreeService
  ) {}

  async softDelete(itemId: string) {
    const now = new Date();
    const rootId = new Types.ObjectId(itemId);

    const childrenIds = await this.tree.getChildrenIdsRecursively(rootId);

    await this.repo.updateMany(
      { _id: { $in: [rootId, ...childrenIds] } },
      { $set: { deletedAt: now } }
    );
  }

  async restore(itemId: string, newParentId?: string | null) {
    const item = await this.repo.findById(itemId);
    if (!item) {
      throw new NotFoundException("Item not found.");
    }

    const update: any = { deletedAt: null };

    if (newParentId !== undefined) {
      if (newParentId !== null) {
        const parent = await this.repo.findById(newParentId);
        if (!parent) {
          throw new NotFoundException("Target parent folder not found.");
        }
        if (parent.deletedAt) {
          throw new BadRequestException("Target parent folder is in trash.");
        }
        if (!parent.isDirectory) {
          throw new BadRequestException("Target parent must be a directory.");
        }
        update.parentId = new Types.ObjectId(newParentId);
      } else {
        update.parentId = null;
      }
    } else if (item.parentId) {
      const parent = await this.repo.findById(item.parentId);
      if (!parent || parent.deletedAt) {
        throw new BadRequestException(
          "Original parent folder is deleted or missing. Please provide a new parent."
        );
      }
    }

    await this.repo.updateById(itemId, { $set: update });

    const rootId = new Types.ObjectId(itemId);
    const childrenIds = await this.tree.getChildrenIdsRecursively(rootId);

    if (childrenIds.length > 0) {
      await this.repo.updateMany(
        { _id: { $in: childrenIds } },
        { $set: { deletedAt: null } }
      );
    }
  }

  async deletePermanent(itemId: string) {
    const rootId = new Types.ObjectId(itemId);
    const childrenIds = await this.tree.getChildrenIdsRecursively(rootId);

    await this.repo.deleteMany({ _id: { $in: [rootId, ...childrenIds] } });
  }
}
