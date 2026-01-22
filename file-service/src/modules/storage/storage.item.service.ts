import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { StorageItem } from './schemas/storage.item.schema';

@Injectable()
export class StorageItemService {
  constructor(@InjectModel('StorageItem') private readonly itemModel: Model<StorageItem>) {}

  async getItemsByParent(parentId: string | null): Promise<StorageItem[]> {
    const query: any = { parentId: parentId };

    if (parentId === null) {
      query.parentId = null;
    } else {
      query.parentId = new Types.ObjectId(parentId);
    }

    return this.itemModel.find(query).lean().exec();
  }

  async getItemById(itemId: string): Promise<StorageItem> {
    const item = await this.itemModel.findById(itemId).lean().exec();
    if (!item) {
      throw new NotFoundException('Item not found.');
    }
    return item;
  }

  async createItem(
    name: string,
    isDirectory: boolean,
    parentId: string | null,
    fileId: string | null,
    userId: string,
    storageId: string,
    creatorId?: number,
  ): Promise<StorageItem> {
    const item = new this.itemModel({
      userId,
      name,
      isDirectory,
      parentId: parentId ? new Types.ObjectId(parentId) : null,
      fileId: fileId ? new Types.ObjectId(fileId) : undefined,
      storageId: storageId,
      creatorId: creatorId || parseInt(userId, 10),
    });
    return item.save();
  }

  async deleteItem(itemId: string): Promise<void> {
    const itemsToDelete = await this.itemModel
      .find({
        $or: [{ _id: new Types.ObjectId(itemId) }, { parentId: new Types.ObjectId(itemId) }],
      })
      .select('_id')
      .exec();

    const ids = itemsToDelete.map((item) => item._id);

    await this.itemModel.deleteMany({ _id: { $in: ids } });
  }

  async getAllItemsByStorageId(storageId: string): Promise<StorageItem[]> {
    const query = { storageId: storageId };

    return this.itemModel.find(query).select('-__v').lean().exec();
  }

  async updateItemTags(itemId: string, tags: string[]): Promise<StorageItem> {
    const item = await this.itemModel.findByIdAndUpdate(
      itemId,
      { $set: { tags } },
      { new: true },
    );

    if (!item) {
      throw new NotFoundException('Item not found.');
    }

    return item;
  }

  async searchItems(params: {
    storageIds: string[];
    query?: string;
    tags?: string[];
    creatorId?: number;
    limit?: number;
    offset?: number;
  }): Promise<StorageItem[]> {
    const { storageIds, query, tags, creatorId, limit = 50, offset = 0 } = params;

    if (storageIds.length === 0) {
      return [];
    }

    // Строим запрос
    const mongoQuery: any = {
      storageId: { $in: storageIds },
    };

    // Фильтр по названию
    if (query) {
      mongoQuery.name = { $regex: query, $options: 'i' };
    }

    // Фильтр по тегам - ищем элементы, у которых есть хотя бы один из указанных тегов
    if (tags && tags.length > 0) {
      mongoQuery.tags = { $in: tags };
    }

    // Фильтр по создателю
    if (creatorId !== undefined) {
      mongoQuery.creatorId = creatorId;
    }

    const items = await this.itemModel
      .find(mongoQuery)
      .limit(limit)
      .skip(offset)
      .lean()
      .exec();

    return items;
  }
}

