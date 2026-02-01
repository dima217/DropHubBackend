import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { FileService } from "./file.service";
import { File, FileDocument } from "./schemas/file.schema";
import { Room, RoomDocument } from "../room/schemas/room.schema";
import { PermissionClientService } from "../permission-client/permission-client.service";
import { S3Service } from "../s3/s3.service";
import { CacheService } from "../../cache/cache.service";
import { FileUploadStatus } from "../../constants/interfaces";

describe("FileService", () => {
  let service: FileService;
  let fileModel: Model<FileDocument>;
  let roomModel: Model<RoomDocument>;
  let permissionClient: PermissionClientService;
  let s3Service: S3Service;
  let cacheService: CacheService;

  const mockFileModel = jest.fn().mockImplementation((data: any) => ({
    save: jest.fn().mockResolvedValue(data),
    ...data,
  })) as any;

  mockFileModel.findById = jest.fn();
  mockFileModel.findByIdAndUpdate = jest.fn();
  mockFileModel.findByIdAndDelete = jest.fn();
  mockFileModel.findOne = jest.fn();
  mockFileModel.find = jest.fn();

  const mockRoomModel = {
    findById: jest.fn(),
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  };

  const mockPermissionClient = {
    verifyUserAccess: jest.fn(),
  };

  const mockS3Service = {
    delete: jest.fn(),
  };

  const mockCacheService = {
    cacheWrapper: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileService,
        {
          provide: getModelToken(File.name),
          useValue: mockFileModel,
        },
        {
          provide: getModelToken(Room.name),
          useValue: mockRoomModel,
        },
        {
          provide: PermissionClientService,
          useValue: mockPermissionClient,
        },
        {
          provide: S3Service,
          useValue: mockS3Service,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: "S3_BUCKET",
          useValue: "test-bucket",
        },
      ],
    }).compile();

    service = module.get<FileService>(FileService);
    fileModel = module.get<Model<FileDocument>>(getModelToken(File.name));
    roomModel = module.get<Model<RoomDocument>>(getModelToken(Room.name));
    permissionClient = module.get<PermissionClientService>(
      PermissionClientService
    );
    s3Service = module.get<S3Service>(S3Service);
    cacheService = module.get<CacheService>(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getFileById", () => {
    it("should return file from cache if exists", async () => {
      const mockFile = {
        _id: "file-id",
        key: "test-key",
        originalName: "test.jpg",
        mimeType: "image/jpeg",
        uploadSession: { status: FileUploadStatus.COMPLETE },
        expiresAt: null,
      };

      mockCacheService.cacheWrapper.mockImplementation(async (key, fn) => {
        return fn();
      });

      mockFileModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockFile),
      });

      const result = await service.getFileById("file-id");

      expect(result).toEqual(mockFile);
      expect(mockCacheService.cacheWrapper).toHaveBeenCalled();
      expect(mockFileModel.findById).toHaveBeenCalledWith("file-id");
    });

    it("should throw NotFoundException if file does not exist", async () => {
      mockCacheService.cacheWrapper.mockImplementation(async (key, fn) => {
        return fn();
      });

      mockFileModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      await expect(service.getFileById("non-existent-id")).rejects.toThrow(
        NotFoundException
      );
    });

    it("should throw NotFoundException if file has expired", async () => {
      const expiredFile = {
        _id: "file-id",
        expiresAt: new Date(Date.now() - 1000),
        uploadSession: { status: FileUploadStatus.COMPLETE },
      };

      mockCacheService.cacheWrapper.mockImplementation(async (key, fn) => {
        return fn();
      });

      mockFileModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(expiredFile),
      });

      await expect(service.getFileById("file-id")).rejects.toThrow(
        NotFoundException
      );
    });

    it("should throw BadRequestException if upload not completed", async () => {
      const incompleteFile = {
        _id: "file-id",
        uploadSession: { status: FileUploadStatus.IN_PROGRESS },
        expiresAt: null,
      };

      mockCacheService.cacheWrapper.mockImplementation(async (key, fn) => {
        return fn();
      });

      mockFileModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(incompleteFile),
      });

      await expect(service.getFileById("file-id")).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe("getFilesByRoomID", () => {
    it("should return files for room", async () => {
      const mockRoom = {
        _id: "room-id",
        files: [
          {
            _id: "file1",
            originalName: "test1.jpg",
            expiresAt: null,
          },
          {
            _id: "file2",
            originalName: "test2.jpg",
            expiresAt: new Date(Date.now() + 10000),
          },
        ],
      };

      mockPermissionClient.verifyUserAccess.mockResolvedValue(true);
      mockCacheService.cacheWrapper.mockImplementation(async (key, fn) => {
        return fn();
      });
      const mockPopulate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockRoom),
      });
      mockRoomModel.findById.mockReturnValue({
        populate: mockPopulate,
      });

      const result = await service.getFilesByRoomID({
        roomId: "room-id",
        userId: 1,
      });

      expect(result).toEqual(mockRoom);
      expect(mockPermissionClient.verifyUserAccess).toHaveBeenCalledWith(
        1,
        "room-id",
        expect.any(String),
        expect.any(Array)
      );
    });

    it("should throw BadRequestException if roomId is missing", async () => {
      await expect(
        service.getFilesByRoomID({ roomId: "", userId: 1 })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("createFileMeta", () => {
    it("should create file metadata", async () => {
      const createDto = {
        originalName: "test.jpg",
        key: "uploads/images/test.jpg",
        size: 1024,
        mimeType: "image/jpeg",
      };

      const mockFile = {
        ...createDto,
        _id: "file-id",
        uploadTime: new Date(),
        downloadCount: 0,
        expiresAt: expect.any(Date),
      };

      mockFileModel.mockReturnValueOnce({
        save: jest.fn().mockResolvedValue(mockFile),
      });

      const result = await service.createFileMeta(createDto);

      expect(result).toEqual(mockFile);
      expect(mockFileModel).toHaveBeenCalled();
    });

    it("should use custom expiresAt if provided", async () => {
      const customExpiresAt = new Date(Date.now() + 3600000);
      const createDto = {
        originalName: "test.jpg",
        key: "uploads/images/test.jpg",
        size: 1024,
        mimeType: "image/jpeg",
        expiresAt: customExpiresAt,
      };

      const mockFile = {
        ...createDto,
        _id: "file-id",
        uploadTime: new Date(),
        downloadCount: 0,
        expiresAt: customExpiresAt,
      };

      mockFileModel.mockReturnValueOnce({
        save: jest.fn().mockResolvedValue(mockFile),
      });

      const result = await service.createFileMeta(createDto);

      expect(result.expiresAt).toEqual(customExpiresAt);
    });
  });

  /*describe('deleteFileCompletely', () => {
    it('should delete file from S3 and database', async () => {
      const mockFile = {
        _id: 'file-id',
        storedName: 'stored-name',
        key: 'uploads/images/test.jpg',
      };

      mockFileModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockFile),
      });
      mockRoomModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      mockS3Service.delete.mockResolvedValue(undefined);
      mockFileModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockFile),
      });

      await service.deleteFileCompletely('stored-name');

      expect(mockS3Service.delete).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'stored-name',
      });
      expect(mockCacheService.delete).toHaveBeenCalledWith('file:meta:file-id');
      expect(mockCacheService.delete).toHaveBeenCalledWith('download:url:uploads/images/test.jpg');
      expect(mockFileModel.findByIdAndDelete).toHaveBeenCalledWith('file-id');
      expect(mockCacheService.delete).toHaveBeenCalledWith('file:meta:file-id');
      expect(mockCacheService.delete).toHaveBeenCalledWith('download:url:uploads/images/test.jpg');
    });

    it('should delete from S3 even if file not found in database', async () => {
      mockFileModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      mockS3Service.delete.mockResolvedValue(undefined);

      await service.deleteFilesCompletely('stored-name');

      expect(mockS3Service.delete).toHaveBeenCalled();
      expect(mockFileModel.findByIdAndDelete).not.toHaveBeenCalled();
    });
  }); */

  describe("invalidateRoomCache", () => {
    it("should invalidate room cache", async () => {
      mockCacheService.delete.mockResolvedValue(undefined);

      await service.invalidateRoomCache("room-id");

      expect(mockCacheService.delete).toHaveBeenCalledWith(
        "room:files:room-id"
      );
    });
  });
});
