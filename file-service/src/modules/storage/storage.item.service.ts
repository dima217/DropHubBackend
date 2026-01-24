import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { StorageItem } from './schemas/storage.item.schema';

@Injectable()
export class StorageItemService {
  constructor(@InjectModel('StorageItem') private readonly itemModel: Model<StorageItem>) {}

  async getItemsByParent(parentId: string | null): Promise<StorageItem[]> {
    const query: any = { parentId: parentId, deletedAt: null };

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

  async softDeleteItem(itemId: string): Promise<void> {
    const now = new Date();
    const itemIdsToUpdate = [new Types.ObjectId(itemId)];
    
    const findAllChildren = async (parentId: Types.ObjectId): Promise<Types.ObjectId[]> => {
      const children = await this.itemModel.find({ parentId }).select('_id isDirectory').exec();
      let ids: Types.ObjectId[] = [];
      for (const child of children) {
        ids.push(child._id);
        if (child.isDirectory) {
          ids = ids.concat(await findAllChildren(child._id));
        }
      }
      return ids;
    };

    const childrenIds = await findAllChildren(new Types.ObjectId(itemId));
    itemIdsToUpdate.push(...childrenIds);

    await this.itemModel.updateMany(
      { _id: { $in: itemIdsToUpdate } },
      { $set: { deletedAt: now } }
    );
  }

  async restoreItem(itemId: string, newParentId?: string | null): Promise<void> {
    const item = await this.itemModel.findById(itemId);
    if (!item) {
      throw new NotFoundException('Item not found.');
    }

    const update: any = { deletedAt: null };

    if (newParentId !== undefined) {
      if (newParentId !== null) {
        const parent = await this.itemModel.findById(newParentId);
        if (!parent) {
          throw new NotFoundException('Target parent folder not found.');
        }
        if (parent.deletedAt) {
          throw new BadRequestException('Target parent folder is in trash.');
        }
        if (!parent.isDirectory) {
          throw new BadRequestException('Target parent must be a directory.');
        }
        update.parentId = new Types.ObjectId(newParentId);
      } else {
        update.parentId = null; 
      }
    } else {
      if (item.parentId) {
        const parent = await this.itemModel.findById(item.parentId);
        if (!parent || parent.deletedAt) {
          throw new BadRequestException(
            'Original parent folder is deleted or missing. Please provide a new parent.',
          );
        }
      }
    }
    await this.itemModel.findByIdAndUpdate(itemId, { $set: update });

    const itemIdsToRestore: Types.ObjectId[] = [];

    const findAllChildren = async (parentId: Types.ObjectId): Promise<Types.ObjectId[]> => {
      const children = await this.itemModel.find({ parentId }).select('_id isDirectory').exec();
      let ids: Types.ObjectId[] = [];
      for (const child of children) {
        ids.push(child._id);
        if (child.isDirectory) {
          ids = ids.concat(await findAllChildren(child._id));
        }
      }
      return ids;
    };

    const childrenIds = await findAllChildren(new Types.ObjectId(itemId));
    itemIdsToRestore.push(...childrenIds);

    if (itemIdsToRestore.length > 0) {
      await this.itemModel.updateMany(
        { _id: { $in: itemIdsToRestore } },
        { $set: { deletedAt: null } },
      );
    }
  }

  async getTrashItems(storageId: string): Promise<StorageItem[]> {
    return this.itemModel
      .find({ storageId, deletedAt: { $ne: null } })
      .sort({ deletedAt: -1 })
      .lean()
      .exec();
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
    const query = { storageId: storageId, deletedAt: null };

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
      deletedAt: null,
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

  async moveItem(itemId: string, newParentId: string | null): Promise<StorageItem> {
    const item = await this.itemModel.findById(itemId);
    if (!item) {
      throw new NotFoundException('Item not found.');
    }

    if (item.deletedAt) {
      throw new BadRequestException('Cannot move deleted item. Restore it first.');
    }

    if (
      String(item.parentId) === String(newParentId) ||
      (item.parentId === null && newParentId === null)
    ) {
      return item;
    }

    if (item.isDirectory && itemId === newParentId) {
      throw new BadRequestException('Cannot move folder into itself.');
    }

    if (newParentId !== null) {
      const parent = await this.itemModel.findById(newParentId);
      if (!parent) {
        throw new NotFoundException('Target folder not found.');
      }
      if (!parent.isDirectory) {
        throw new BadRequestException('Target must be a folder.');
      }
      if (parent.deletedAt) {
        throw new BadRequestException('Cannot move item to deleted folder.');
      }
      if (parent.storageId !== item.storageId) {
        throw new BadRequestException('Cannot move item to another storage.');
      }

      if (item.isDirectory) {
        let currentId: Types.ObjectId | null = parent._id;
        while (currentId) {
          if (currentId.toString() === itemId) {
            throw new BadRequestException('Cannot move folder into its own subdirectory.');
          }
          const currentItem = await this.itemModel
            .findById(currentId)
            .select('parentId')
            .lean()
            .exec();
          if (!currentItem || !currentItem.parentId) {
            currentId = null;
          } else {
            currentId = currentItem.parentId;
          }
        }
      }
    }

    item.parentId = newParentId ? new Types.ObjectId(newParentId) : null;
    return item.save();
  }
}

