import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { StorageItem } from "./schemas/storage.item.schema";
import { IStorageItemService } from "./interfaces/storage-item-service.interface";

@Injectable()
export class StorageItemService implements IStorageItemService {
  constructor(
    @InjectModel("StorageItem") private readonly itemModel: Model<StorageItem>
  ) {}

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

    return this.itemModel.find(query).lean().exec();
  }

  async getChildrenCount(
    itemId: string
  ): Promise<{ total: number; files: number; folders: number }> {
    const children = await this.itemModel
      .find({ parentId: new Types.ObjectId(itemId), deletedAt: null })
      .select("isDirectory")
      .lean()
      .exec();

    const total = children.length;
    const files = children.filter((child) => !child.isDirectory).length;
    const folders = children.filter((child) => child.isDirectory).length;

    return { total, files, folders };
  }

  async getItemById(itemId: string): Promise<StorageItem> {
    const item = await this.itemModel.findById(itemId).lean().exec();
    if (!item) {
      throw new NotFoundException("Item not found.");
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
    creatorId?: number
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

    const findAllChildren = async (
      parentId: Types.ObjectId
    ): Promise<Types.ObjectId[]> => {
      const children = await this.itemModel
        .find({ parentId })
        .select("_id isDirectory")
        .exec();
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

  async restoreItem(
    itemId: string,
    newParentId?: string | null
  ): Promise<void> {
    const item = await this.itemModel.findById(itemId);
    if (!item) {
      throw new NotFoundException("Item not found.");
    }

    const update: any = { deletedAt: null };

    if (newParentId !== undefined) {
      if (newParentId !== null) {
        const parent = await this.itemModel.findById(newParentId);
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
    } else {
      if (item.parentId) {
        const parent = await this.itemModel.findById(item.parentId);
        if (!parent || parent.deletedAt) {
          throw new BadRequestException(
            "Original parent folder is deleted or missing. Please provide a new parent."
          );
        }
      }
    }
    await this.itemModel.findByIdAndUpdate(itemId, { $set: update });

    const itemIdsToRestore: Types.ObjectId[] = [];

    const findAllChildren = async (
      parentId: Types.ObjectId
    ): Promise<Types.ObjectId[]> => {
      const children = await this.itemModel
        .find({ parentId })
        .select("_id isDirectory")
        .exec();
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
        { $set: { deletedAt: null } }
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
        $or: [
          { _id: new Types.ObjectId(itemId) },
          { parentId: new Types.ObjectId(itemId) },
        ],
      })
      .select("_id")
      .exec();

    const ids = itemsToDelete.map((item) => item._id);

    await this.itemModel.deleteMany({ _id: { $in: ids } });
  }

  async getAllItemsByStorageId(storageId: string): Promise<StorageItem[]> {
    const query = { storageId: storageId, deletedAt: null };

    return this.itemModel.find(query).select("-__v").lean().exec();
  }

  async updateItemTags(itemId: string, tags: string[]): Promise<StorageItem> {
    const item = await this.itemModel.findByIdAndUpdate(
      itemId,
      { $set: { tags } },
      { new: true }
    );

    if (!item) {
      throw new NotFoundException("Item not found.");
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
    const {
      storageIds,
      query,
      tags,
      creatorId,
      limit = 50,
      offset = 0,
    } = params;

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
      mongoQuery.name = { $regex: query, $options: "i" };
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

  async moveItem(
    itemId: string,
    newParentId: string | null
  ): Promise<StorageItem> {
    const item = await this.itemModel.findById(itemId);
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
      const parent = await this.itemModel.findById(newParentId);
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
          const currentItem = await this.itemModel
            .findById(currentId)
            .select("parentId")
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

  async renameItem(itemId: string, newName: string): Promise<StorageItem> {
    if (!newName || newName.trim().length === 0) {
      throw new BadRequestException("Item name cannot be empty.");
    }

    const item = await this.itemModel.findById(itemId);
    if (!item) {
      throw new NotFoundException("Item not found.");
    }

    if (item.deletedAt) {
      throw new BadRequestException(
        "Cannot rename deleted item. Restore it first."
      );
    }

    const existingItem = await this.itemModel.findOne({
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

  async copyItem(
    itemId: string,
    targetParentId: string | null,
    userId: string,
    storageId: string
  ): Promise<StorageItem> {
    const sourceItem = await this.itemModel.findById(itemId).lean();
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
      const targetParent = await this.itemModel.findById(targetParentId);
      if (!targetParent) {
        throw new NotFoundException("Target folder not found.");
      }
      if (!targetParent.isDirectory) {
        throw new BadRequestException("Target must be a folder.");
      }
      if (targetParent.deletedAt) {
        throw new BadRequestException("Cannot copy item to deleted folder.");
      }
      if (targetParent.storageId !== storageId) {
        throw new BadRequestException("Cannot copy item to another storage.");
      }
    }

    // Генерируем имя для копии
    const baseName = sourceItem.name;
    let copyName = `${baseName} (copy)`;
    let counter = 1;

    // Проверяем уникальность имени
    while (
      await this.itemModel.findOne({
        parentId: targetParentId ? new Types.ObjectId(targetParentId) : null,
        name: copyName,
        storageId: storageId,
        deletedAt: null,
      })
    ) {
      copyName = `${baseName} (copy ${counter})`;
      counter++;
    }

    const copiedItem = new this.itemModel({
      userId,
      name: copyName,
      isDirectory: sourceItem.isDirectory,
      parentId: targetParentId ? new Types.ObjectId(targetParentId) : null,
      fileId: sourceItem.fileId
        ? new Types.ObjectId(sourceItem.fileId)
        : undefined,
      storageId: storageId,
      creatorId: sourceItem.creatorId || parseInt(userId, 10),
      tags: sourceItem.tags ? [...sourceItem.tags] : [],
    });

    const savedItem = await copiedItem.save();

    // Если это директория, рекурсивно копируем все дочерние элементы
    if (sourceItem.isDirectory) {
      const copyChildren = async (
        sourceParentId: Types.ObjectId,
        targetParentId: Types.ObjectId
      ) => {
        const children = await this.itemModel
          .find({ parentId: sourceParentId, deletedAt: null })
          .lean();

        for (const child of children) {
          const childCopyName = child.name;
          let finalChildName = childCopyName;
          let childCounter = 1;

          // Проверяем уникальность имени дочернего элемента
          while (
            await this.itemModel.findOne({
              parentId: targetParentId,
              name: finalChildName,
              storageId: storageId,
              deletedAt: null,
            })
          ) {
            finalChildName = `${childCopyName} (${childCounter})`;
            childCounter++;
          }

          const childCopy = new this.itemModel({
            userId,
            name: finalChildName,
            isDirectory: child.isDirectory,
            parentId: targetParentId,
            fileId: child.fileId ? new Types.ObjectId(child.fileId) : undefined,
            storageId: storageId,
            creatorId: child.creatorId || parseInt(userId, 10),
            tags: child.tags ? [...child.tags] : [],
          });

          const savedChild = await childCopy.save();

          // Рекурсивно копируем дочерние элементы, если это директория
          if (child.isDirectory) {
            await copyChildren(child._id, savedChild._id);
          }
        }
      };

      await copyChildren(sourceItem._id, savedItem._id);
    }

    return savedItem;
  }
}
