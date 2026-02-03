import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { v4 as uuidv4 } from "uuid";

export type UploadSessionDocument = UploadSession & Document;

@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  collection: "upload_sessions",
})
export class UploadSession {
  @Prop({ required: true })
  key: string;

  @Prop({ required: true })
  originalName: string;

  @Prop({ required: true, unique: true, default: () => uuidv4() })
  storedName: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true })
  size: number;

  @Prop({ required: true })
  creatorId: number;

  @Prop()
  roomId?: string;

  @Prop()
  storageId?: string;
}

export const UploadSessionSchema = SchemaFactory.createForClass(UploadSession);

UploadSessionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3600 });
