import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { createHash, randomUUID } from "crypto";
import { promises as fs } from "fs";
import { Model, Types } from "mongoose";
import { tmpdir } from "os";
import { join } from "path";
import { Readable } from "stream";
import { promisify } from "util";
import { execFile } from "child_process";
import { parse as parseCsv } from "csv-parse/sync";
import { Parser as JsonToCsvParser } from "json2csv";
import { XMLBuilder, XMLParser } from "fast-xml-parser";
import * as XLSX from "xlsx";
import { PDFParse } from "pdf-parse";
import { File, FileDocument } from "../../schemas/file.schema";
import { Room, RoomDocument } from "../../../room/schemas/room.schema";
import { StorageItem } from "../../../storage/schemas/storage.item.schema";
import { S3Service } from "../../../s3/s3.service";
import { S3_BUCKET_TOKEN } from "../../../s3/s3.tokens";
import { ConvertFileDto, FileConversionType } from "../../dto/convert-file.dto";
import { FileUploadStatus } from "../../../../constants/interfaces";

const execFileAsync = promisify(execFile);

interface ConvertedArtifact {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  text?: string;
}

type TargetContext =
  | { type: "room"; roomId: string }
  | {
      type: "storage";
      storageId: string;
      parentId: Types.ObjectId | null;
      userId: string;
      creatorId?: number;
    };

export interface ConvertFileResult {
  success: boolean;
  conversion: FileConversionType;
  sourceFileId: string;
  sourceChecksum: string;
  targetType: "room" | "storage";
  targetId: string;
  createdFiles: Array<{
    fileId: string;
    fileName: string;
    mimeType: string;
    size: number;
    text?: string;
  }>;
}

@Injectable()
export class ConversionService implements OnModuleInit {
  private readonly logger = new Logger(ConversionService.name);
  private binaryStatus: Record<"soffice" | "pdftoppm", boolean> = {
    soffice: false,
    pdftoppm: false,
  };

  constructor(
    @InjectModel(File.name) private readonly fileModel: Model<FileDocument>,
    @InjectModel(Room.name) private readonly roomModel: Model<RoomDocument>,
    @InjectModel(StorageItem.name)
    private readonly storageItemModel: Model<StorageItem>,
    private readonly s3Service: S3Service,
    @Inject(S3_BUCKET_TOKEN) private readonly bucket: string
  ) {}

  async onModuleInit(): Promise<void> {
    const sofficeCommand = process.env.LIBREOFFICE_BIN || "soffice";
    this.binaryStatus.soffice = await this.checkBinary(sofficeCommand, ["--version"]);
    this.binaryStatus.pdftoppm = await this.checkBinary("pdftoppm", ["-v"]);

    const strictCheck = process.env.CONVERSION_BINARIES_REQUIRED === "true";
    const missing = Object.entries(this.binaryStatus)
      .filter(([, ok]) => !ok)
      .map(([name]) => name);

    if (missing.length > 0) {
      const msg = `Missing conversion binaries: ${missing.join(", ")}`;
      if (strictCheck) {
        throw new BadRequestException(msg);
      }
      this.logger.warn(`${msg}. Related conversions will fail until binaries are installed.`);
    } else {
      this.logger.log("All required conversion binaries are available.");
    }
  }

  async convertFile(params: ConvertFileDto): Promise<ConvertFileResult> {
    const file = await this.fileModel.findById(params.fileId).lean();
    if (!file) {
      throw new NotFoundException("File not found");
    }

    const target = await this.resolveTarget(params, file._id.toString());
    const sourceBuffer = await this.loadSourceBuffer(file.key);
    const sourceChecksum = createHash("sha256").update(sourceBuffer).digest("hex");

    const artifacts = await this.convertByType(params.conversion, file.originalName, sourceBuffer);
    const createdFiles = await this.saveConvertedArtifacts(artifacts, target, file.creatorId, file.expiresAt);

    return {
      success: true,
      conversion: params.conversion,
      sourceFileId: params.fileId,
      sourceChecksum,
      targetType: target.type,
      targetId: target.type === "room" ? target.roomId : target.storageId,
      createdFiles,
    };
  }

  private async resolveTarget(params: ConvertFileDto, sourceFileId: string): Promise<TargetContext> {
    if (params.roomId && params.storageId) {
      throw new BadRequestException("Use either roomId or storageId, not both");
    }
    if (!params.roomId && !params.storageId) {
      throw new BadRequestException("roomId or storageId is required");
    }

    if (params.roomId) {
      const room = await this.roomModel.findById(params.roomId).lean();
      if (!room) {
        throw new NotFoundException("Room not found");
      }
      if (!room.files?.some((f) => f.toString() === sourceFileId)) {
        throw new BadRequestException("File does not belong to the room");
      }
      return { type: "room", roomId: params.roomId };
    }

    const sourceItem = await this.storageItemModel
      .findOne({
        storageId: params.storageId,
        fileId: new Types.ObjectId(sourceFileId),
        deletedAt: null,
      })
      .lean();

    if (!sourceItem) {
      throw new BadRequestException("File does not belong to the storage");
    }

    if (params.resourceId) {
      const inScope = await this.isDescendantOrSelf(sourceItem._id, params.resourceId);
      if (!inScope) {
        throw new BadRequestException("File is outside shared resource scope");
      }
    }

    const parentId =
      params.parentId != null
        ? new Types.ObjectId(params.parentId)
        : (sourceItem.parentId as Types.ObjectId | null) ?? null;

    return {
      type: "storage",
      storageId: params.storageId!,
      parentId,
      userId: sourceItem.userId,
      creatorId: sourceItem.creatorId,
    };
  }

  private async isDescendantOrSelf(itemId: Types.ObjectId, ancestorId: string): Promise<boolean> {
    if (itemId.toString() === ancestorId) {
      return true;
    }

    let current = await this.storageItemModel.findById(itemId).lean();
    while (current?.parentId) {
      if (current.parentId.toString() === ancestorId) {
        return true;
      }
      current = await this.storageItemModel.findById(current.parentId).lean();
    }
    return false;
  }

  private async convertByType(
    conversion: FileConversionType,
    originalName: string,
    sourceBuffer: Buffer
  ): Promise<ConvertedArtifact[]> {
    switch (conversion) {
      case "csv_to_json":
        return [this.convertCsvToJson(originalName, sourceBuffer)];
      case "json_to_csv":
        return [this.convertJsonToCsv(originalName, sourceBuffer)];
      case "xml_to_json":
        return [this.convertXmlToJson(originalName, sourceBuffer)];
      case "json_to_xml":
        return [this.convertJsonToXml(originalName, sourceBuffer)];
      case "xlsx_to_json":
        return [this.convertXlsxToJson(originalName, sourceBuffer)];
      case "docx_to_pdf":
        return [await this.convertOfficeToPdf(originalName, sourceBuffer, ".docx")];
      case "pptx_to_pdf":
        return [await this.convertOfficeToPdf(originalName, sourceBuffer, ".pptx")];
      case "pdf_to_text":
        return [await this.convertPdfToText(originalName, sourceBuffer)];
      case "pdf_to_images":
        return await this.convertPdfToImages(originalName, sourceBuffer);
      default:
        throw new BadRequestException("Unsupported conversion type");
    }
  }

  private async saveConvertedArtifacts(
    artifacts: ConvertedArtifact[],
    target: TargetContext,
    sourceCreatorId: number | undefined,
    sourceExpiresAt: Date | null
  ): Promise<ConvertFileResult["createdFiles"]> {
    const created: ConvertFileResult["createdFiles"] = [];

    for (const artifact of artifacts) {
      const key = this.buildStorageKey(artifact.fileName);
      await this.s3Service.upload({
        Bucket: this.bucket,
        Key: key,
        Body: artifact.buffer,
        ContentType: artifact.mimeType,
      });

      const fileDoc = await this.fileModel.create({
        originalName: artifact.fileName,
        key,
        size: artifact.buffer.length,
        mimeType: artifact.mimeType,
        uploadTime: new Date(),
        downloadCount: 0,
        uploadedParts: 1,
        expiresAt: sourceExpiresAt ?? null,
        creatorId: target.type === "storage" ? target.creatorId ?? sourceCreatorId : sourceCreatorId,
        uploadSession: {
          status: FileUploadStatus.COMPLETE,
        },
      });

      if (target.type === "room") {
        await this.roomModel.findByIdAndUpdate(target.roomId, {
          $push: { files: fileDoc._id },
        });
      } else {
        await this.storageItemModel.create({
          userId: target.userId,
          name: artifact.fileName,
          storageId: target.storageId,
          isDirectory: false,
          parentId: target.parentId,
          fileId: fileDoc._id,
          creatorId: target.creatorId ?? sourceCreatorId,
          deletedAt: null,
        });
      }

      created.push({
        fileId: fileDoc._id.toString(),
        fileName: artifact.fileName,
        mimeType: artifact.mimeType,
        size: artifact.buffer.length,
        text: artifact.text,
      });
    }

    return created;
  }

  private convertCsvToJson(originalName: string, sourceBuffer: Buffer): ConvertedArtifact {
    const records = parseCsv(sourceBuffer.toString("utf-8"), {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
    const text = JSON.stringify(records, null, 2);
    return {
      fileName: this.replaceExtension(originalName, ".json"),
      mimeType: "application/json",
      buffer: Buffer.from(text, "utf-8"),
    };
  }

  private convertJsonToCsv(originalName: string, sourceBuffer: Buffer): ConvertedArtifact {
    const parsed = JSON.parse(sourceBuffer.toString("utf-8"));
    const rows = Array.isArray(parsed) ? parsed : [parsed];
    const parser = new JsonToCsvParser({});
    const csv = parser.parse(rows);
    return {
      fileName: this.replaceExtension(originalName, ".csv"),
      mimeType: "text/csv",
      buffer: Buffer.from(csv, "utf-8"),
    };
  }

  private convertXmlToJson(originalName: string, sourceBuffer: Buffer): ConvertedArtifact {
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
    const parsed = parser.parse(sourceBuffer.toString("utf-8"));
    const text = JSON.stringify(parsed, null, 2);
    return {
      fileName: this.replaceExtension(originalName, ".json"),
      mimeType: "application/json",
      buffer: Buffer.from(text, "utf-8"),
    };
  }

  private convertJsonToXml(originalName: string, sourceBuffer: Buffer): ConvertedArtifact {
    const parsed = JSON.parse(sourceBuffer.toString("utf-8"));
    const builder = new XMLBuilder({ ignoreAttributes: false, format: true, suppressEmptyNode: true });
    const xml = builder.build(parsed);
    return {
      fileName: this.replaceExtension(originalName, ".xml"),
      mimeType: "application/xml",
      buffer: Buffer.from(xml, "utf-8"),
    };
  }

  private convertXlsxToJson(originalName: string, sourceBuffer: Buffer): ConvertedArtifact {
    const workbook = XLSX.read(sourceBuffer, { type: "buffer" });
    const sheets: Record<string, unknown[]> = {};
    for (const sheetName of workbook.SheetNames) {
      sheets[sheetName] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null });
    }
    const text = JSON.stringify(sheets, null, 2);
    return {
      fileName: this.replaceExtension(originalName, ".json"),
      mimeType: "application/json",
      buffer: Buffer.from(text, "utf-8"),
    };
  }

  private async convertPdfToText(originalName: string, sourceBuffer: Buffer): Promise<ConvertedArtifact> {
    const parser = new PDFParse({ data: sourceBuffer });
    const parsed = await parser.getText();
    const text = parsed.text ?? "";
    await parser.destroy().catch(() => undefined);
    return {
      fileName: this.replaceExtension(originalName, ".txt"),
      mimeType: "text/plain",
      buffer: Buffer.from(text, "utf-8"),
      text,
    };
  }

  private async convertPdfToImages(
    originalName: string,
    sourceBuffer: Buffer
  ): Promise<ConvertedArtifact[]> {
    const workDir = await fs.mkdtemp(join(tmpdir(), "pdf-img-"));
    const inputPath = join(workDir, "input.pdf");
    const outputPrefix = join(workDir, "page");

    try {
      await fs.writeFile(inputPath, sourceBuffer);
      await this.runBinary("pdftoppm", ["-png", inputPath, outputPrefix], "pdftoppm");

      const allFiles = await fs.readdir(workDir);
      const pageImages = allFiles
        .filter((name) => name.startsWith("page-") && name.endsWith(".png"))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

      if (pageImages.length === 0) {
        throw new BadRequestException("PDF to images produced no pages");
      }

      const base = this.baseName(originalName);
      const result: ConvertedArtifact[] = [];
      for (const imageName of pageImages) {
        const imageBuffer = await fs.readFile(join(workDir, imageName));
        result.push({
          fileName: `${base}-${imageName}`,
          mimeType: "image/png",
          buffer: imageBuffer,
        });
      }
      return result;
    } finally {
      await fs.rm(workDir, { recursive: true, force: true });
    }
  }

  private async convertOfficeToPdf(
    originalName: string,
    sourceBuffer: Buffer,
    extension: ".docx" | ".pptx"
  ): Promise<ConvertedArtifact> {
    const workDir = await fs.mkdtemp(join(tmpdir(), "office-pdf-"));
    const inputPath = join(workDir, `input${extension}`);
    const outputPath = join(workDir, "input.pdf");

    try {
      await fs.writeFile(inputPath, sourceBuffer);
      await this.runBinary(
        process.env.LIBREOFFICE_BIN || "soffice",
        ["--headless", "--convert-to", "pdf", "--outdir", workDir, inputPath],
        "LibreOffice (soffice)"
      );
      const pdfBuffer = await fs.readFile(outputPath);
      return {
        fileName: this.replaceExtension(originalName, ".pdf"),
        mimeType: "application/pdf",
        buffer: pdfBuffer,
      };
    } finally {
      await fs.rm(workDir, { recursive: true, force: true });
    }
  }

  private async loadSourceBuffer(key: string): Promise<Buffer> {
    const object = await this.s3Service.get({
      Bucket: this.bucket,
      Key: key,
    });
    if (!object.Body) {
      throw new NotFoundException("File body not found in storage");
    }
    return this.bodyToBuffer(object.Body);
  }

  private async bodyToBuffer(body: unknown): Promise<Buffer> {
    if (Buffer.isBuffer(body)) return body;
    if (typeof body === "string") return Buffer.from(body);
    if (body instanceof Uint8Array) return Buffer.from(body);

    const withTransform = body as { transformToByteArray?: () => Promise<Uint8Array> };
    if (typeof withTransform.transformToByteArray === "function") {
      return Buffer.from(await withTransform.transformToByteArray());
    }

    if (body instanceof Readable) {
      const chunks: Buffer[] = [];
      for await (const chunk of body) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      return Buffer.concat(chunks);
    }

    throw new BadRequestException("Unsupported file body type returned from storage");
  }

  private buildStorageKey(fileName: string): string {
    return `converted/${Date.now()}-${randomUUID()}-${this.normalizeFileName(fileName)}`;
  }

  private normalizeFileName(fileName: string): string {
    return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  }

  private replaceExtension(fileName: string, targetExt: string): string {
    const dotIndex = fileName.lastIndexOf(".");
    if (dotIndex <= 0) return `${fileName}${targetExt}`;
    return `${fileName.slice(0, dotIndex)}${targetExt}`;
  }

  private baseName(fileName: string): string {
    const dotIndex = fileName.lastIndexOf(".");
    if (dotIndex <= 0) return fileName;
    return fileName.slice(0, dotIndex);
  }

  private async runBinary(command: string, args: string[], humanName: string): Promise<void> {
    if (humanName.includes("LibreOffice") && !this.binaryStatus.soffice) {
      throw new BadRequestException("LibreOffice (soffice) is not installed on the server");
    }
    if (humanName === "pdftoppm" && !this.binaryStatus.pdftoppm) {
      throw new BadRequestException("pdftoppm is not installed on the server");
    }

    try {
      await execFileAsync(command, args);
    } catch (error) {
      const err = error as NodeJS.ErrnoException & { stderr?: string };
      if (err.code === "ENOENT") {
        throw new BadRequestException(`${humanName} is not installed on the server`);
      }
      const details = err.stderr?.trim();
      throw new BadRequestException(details ? `${humanName} failed: ${details}` : `${humanName} failed`);
    }
  }

  private async checkBinary(command: string, args: string[]): Promise<boolean> {
    try {
      await execFileAsync(command, args);
      this.logger.log(`Binary check passed: ${command}`);
      return true;
    } catch {
      this.logger.warn(`Binary check failed: ${command}`);
      return false;
    }
  }
}

