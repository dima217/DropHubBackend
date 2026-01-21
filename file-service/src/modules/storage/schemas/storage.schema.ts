import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { StorageItem } from './storage.item.schema';

export type UserStorageDocument = UserStorage & Document<Types.ObjectId>;

@Schema({ collection: 'user_storage', timestamps: true })
export class UserStorage {
  @Prop({ type: [StorageItem], default: [] })
  items: StorageItem[]; 

  @Prop({ type: Date, default: () => new Date() })
  createdAt: Date;

  @Prop({ type: Number, default: 1024 })
  maxBytes: number;
}

export const UserStorageSchema = SchemaFactory.createForClass(UserStorage);

