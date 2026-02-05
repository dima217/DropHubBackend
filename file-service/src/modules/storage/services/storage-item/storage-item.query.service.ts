import { Injectable } from "@nestjs/common";
import { Types } from "mongoose";
import { StorageItemRepository } from "./storage-item.repository";
import { StorageItem } from "../../schemas/storage.item.schema";
import { StorageItemLean } from "../../interfaces/types/storage-item.lean";

interface SearchParams {
  storageIds: string[];
  query?: string;
  tags?: string[];
  creatorId?: number;
  limit?: number;
  offset?: number;
}

@Injectable()
export class StorageItemQueryService {
  constructor(private readonly repo: StorageItemRepository) {}

  async getItemById(itemId: string): Promise<StorageItemLean | null> {
    return this.repo.findByIdLean(itemId);
  }

  async getItemsByParent(
    parentId: string | null,
    storageId?: string
  ): Promise<StorageItem[]> {
    const query: any = { deletedAt: null };

    if (parentId === null) {
      query.parentId = null;
      if (storageId) {
        query.storageId = storageId;
      }
    } else {
      query.parentId = new Types.ObjectId(parentId);
    }

    return this.repo.findLean(query);
  }

  async getTrashItems(storageId: string): Promise<StorageItem[]> {
    return this.repo.findLean({
      storageId,
      deletedAt: { $ne: null },
    });
  }

  async searchItems(params: SearchParams): Promise<StorageItem[]> {
    const {
      storageIds,
      query,
      tags,
      creatorId,
      limit = 50,
      offset = 0,
    } = params;

    if (!storageIds || storageIds.length === 0) {
      return [];
    }

    return this.repo.search({
      storageIds,
      query,
      tags,
      creatorId,
      limit,
      offset,
    });
  }
}
