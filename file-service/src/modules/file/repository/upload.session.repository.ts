import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, isValidObjectId } from "mongoose";
import {
  UploadSession,
  UploadSessionDocument,
} from "../schemas/upload-session.schema";

@Injectable()
export class UploadSessionRepository {
  private readonly logger = new Logger(UploadSessionRepository.name);

  constructor(
    @InjectModel(UploadSession.name)
    private readonly model: Model<UploadSessionDocument>
  ) {}

  async create(data: Partial<UploadSession>) {
    try {
      return await this.model.create(data);
    } catch (err) {
      this.logger.error("Failed to create UploadSession", err.stack, {
        data,
      });
      throw new InternalServerErrorException("Failed to create upload session");
    }
  }

  async findById(id: string) {
    try {
      if (!isValidObjectId(id)) {
        this.logger.warn(`Invalid uploadSession id: ${id}`);
        return null;
      }

      return await this.model.findById(id).exec();
    } catch (err) {
      this.logger.error(`Failed to find UploadSession by id: ${id}`, err.stack);
      throw new InternalServerErrorException("Failed to fetch upload session");
    }
  }

  async deleteById(id: string) {
    try {
      if (!isValidObjectId(id)) {
        this.logger.warn(`Invalid uploadSession id for delete: ${id}`);
        return null;
      }

      return await this.model.findByIdAndDelete(id).exec();
    } catch (err) {
      this.logger.error(
        `Failed to delete UploadSession by id: ${id}`,
        err.stack
      );
      throw new InternalServerErrorException("Failed to delete upload session");
    }
  }
}
