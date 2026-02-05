import { Types } from "mongoose";

export type StorageItemLean = {
  _id: Types.ObjectId;
  userId: string;
  name: string;
  storageId: string;
  isDirectory: boolean;
  parentId: Types.ObjectId | null;
  fileId?: Types.ObjectId;
  creatorId?: number;
  tags?: string[];
  deletedAt?: Date | null;
};
