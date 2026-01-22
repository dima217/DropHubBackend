import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ collection: 'StorageItem', timestamps: true })
export class StorageItem {
  _id: Types.ObjectId;

  @Prop({ type: String })
  userId: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  storageId: string;

  @Prop({ type: Boolean, default: false })
  isDirectory: boolean;

  @Prop({ type: Types.ObjectId, ref: 'UserStorageItem', default: null })
  parentId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'SharedFile', default: null })
  fileId?: Types.ObjectId;

  @Prop({ type: Number })
  creatorId?: number;

  @Prop({ type: [String], default: [] })
  tags?: string[];
}

export const StorageItemSchema = SchemaFactory.createForClass(StorageItem);
