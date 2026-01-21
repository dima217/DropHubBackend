import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { S3WriteStream } from "../../utils/s3-write-stream";
import { File, FileDocument } from "../../schemas/file.schema";
import { Room, RoomDocument } from "../../../room/schemas/room.schema";
import { FileUploadStatus } from "../../../../constants/interfaces";
import { UploadCompleteDto } from "../../dto/upload/upload-complete.dto";
import { UploadInitMultipartDto } from "../../dto/upload/upload-init-multipart.dto";
import { FileService } from "../../file.service";

@Injectable()
export class MultipartUploadService {
  constructor(
    private readonly s3Stream: S3WriteStream,
    private readonly fileService: FileService,
    @InjectModel(File.name) private readonly fileModel: Model<FileDocument>,
    @InjectModel(Room.name) private readonly roomModel: Model<RoomDocument>
  ) {}

  async initUploadMultipart(params: UploadInitMultipartDto, ip: string) {
    const init = await this.s3Stream.initMultipart(
      params.fileName,
      params.totalParts,
      params.fileType,
    );
    if (!init) {
      throw new BadRequestException({ error: "Init multipart failed" });
    }
    const fileUploadMeta = await this.fileService.createFileMeta({
      originalName: params.fileName,
      key: init.key,
      size: params.fileSize,
      mimeType: params.fileType,
      uploaderIp: ip,
      uploadSession: {
        uploadId: init.uploadId,
        status: FileUploadStatus.IN_PROGRESS,
      },
    });

    return {
      uploadId: init.uploadId,
      key: init.key,
      fileId: fileUploadMeta._id,
      presignedUrls: init.presignedUrls,
    };
  }

  async completeMultipart(params: UploadCompleteDto) {
    const file = await this.fileService.getFileByUploadId(params.uploadId);

    await this.s3Stream.completeMultipart(
      file.key,
      params.uploadId,
      params.parts
    );

    await this.fileModel.findByIdAndUpdate(file._id, {
      $set: { "uploadSession.status": FileUploadStatus.COMPLETE },
    });

    await this.roomModel.findByIdAndUpdate(params.roomId, {
      $push: { files: file._id },
      $set: { "uploadSession.status": FileUploadStatus.COMPLETE },
    });
  }
}
