import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { StorageItem } from "../../schemas/storage.item.schema";
import { StorageItemLean } from "../../interfaces/types/storage-item.lean";

@Injectable()
export class StorageItemRepository {
  constructor(
    @InjectModel("StorageItem")
    private readonly model: Model<StorageItem>
  ) {}

  findById(id: string | Types.ObjectId) {
    return this.model.findById(id);
  }

  findOne(query: any) {
    return this.model.findOne(query);
  }

  findLean(query: any): Promise<StorageItemLean[]> {
    return this.model.find(query).lean().exec();
  }

  findByIdLean(id: string | Types.ObjectId): Promise<StorageItemLean | null> {
    return this.model.findById(id).lean().exec();
  }

  create(data: Partial<StorageItem>) {
    return new this.model(data).save();
  }

  updateMany(filter: any, update: any) {
    return this.model.updateMany(filter, update);
  }

  updateById(id: string, update: any) {
    return this.model.findByIdAndUpdate(id, update, { new: true });
  }

  deleteMany(filter: any) {
    return this.model.deleteMany(filter);
  }

  removeTags(storageId: string, tags: string[]) {
    return this.model.updateMany(
      { storageId },
      {
        $pull: {
          tags: { $in: tags },
        },
      }
    );
  }

  search(params: {
    storageIds: string[];
    query?: string;
    tags?: string[];
    creatorId?: number;
    limit: number;
    offset: number;
  }): Promise<StorageItem[]> {
    const { storageIds, query, tags, creatorId, limit, offset } = params;

    const mongoQuery: any = {
      storageId: { $in: storageIds },
      deletedAt: null,
    };

    if (query) {
      mongoQuery.name = { $regex: query, $options: "i" };
    }

    if (tags && tags.length > 0) {
      mongoQuery.tags = { $in: tags };
    }

    if (creatorId !== undefined) {
      mongoQuery.creatorId = creatorId;
    }

    return this.model.find(mongoQuery).limit(limit).skip(offset).lean().exec();
  }
}
