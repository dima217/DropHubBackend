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
  ): Promise<StorageItem> {
    const item = new this.itemModel({
      userId,
      name,
      isDirectory,
      parentId: parentId ? new Types.ObjectId(parentId) : null,
      fileId: fileId ? new Types.ObjectId(fileId) : undefined,
      storageId: storageId,
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
}

