import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { FileUploadStatus } from '../../../constants/interfaces';
import { v4 as uuidv4 } from 'uuid';

export type FileDocument = File & Document;

@Schema({ timestamps: true })
export class File {
  @Prop({ required: true })
  originalName: string;

  @Prop({ required: true })
  key: string;

  @Prop({ required: true, unique: true, default: () => uuidv4() })
  storedName: string;

  @Prop({ required: true })
  size: number;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true })
  uploadTime: Date;

  @Prop({ required: true, default: 0 })
  downloadCount: number;

  @Prop({ required: true, default: 0 })
  uploadedParts: number;

  @Prop()
  uploaderIp?: string;

  @Prop({
    type: Date,
    default: null,
  })
  expiresAt: Date | null;

  @Prop({
    type: Object,
    default: () => ({
      uploadId: undefined,
      status: FileUploadStatus.IN_PROGRESS,
    }),
  })
  uploadSession: {
    uploadId?: string;
    status: FileUploadStatus;
  };

  @Prop({ type: Number })
  creatorId?: number;
}

export const FileSchema = SchemaFactory.createForClass(File);

