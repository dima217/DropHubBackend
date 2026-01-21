import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { DownloadService } from './download.service';
import { FileService } from '../../file.service';
import { S3Service } from '../../../s3/s3.service';
import { PermissionClientService } from '../../../permission-client/permission-client.service';
import { TokenClientService } from '../../../token-client/token-client.service';
import { S3ReadStream } from '../../utils/s3-read-stream';
import { CacheService } from '../../../../cache/cache.service';

describe('DownloadService', () => {
  let service: DownloadService;
  let fileService: FileService;
  let s3Service: S3Service;
  let permissionClient: PermissionClientService;
  let tokenService: TokenClientService;
  let cacheService: CacheService;

  const mockFileService = {
    getFileById: jest.fn(),
  };

  const mockS3Service = {
    client: {},
    createGetResourceCommand: jest.fn(),
  };

  const mockPermissionClient = {
    verifyUserAccess: jest.fn(),
  };

  const mockTokenService = {
    validateToken: jest.fn(),
  };

  const mockS3ReadStream = {
    download: jest.fn(),
  };

  const mockCacheService = {
    cacheWrapper: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DownloadService,
        {
          provide: FileService,
          useValue: mockFileService,
        },
        {
          provide: S3Service,
          useValue: mockS3Service,
        },
        {
          provide: PermissionClientService,
          useValue: mockPermissionClient,
        },
        {
          provide: TokenClientService,
          useValue: mockTokenService,
        },
        {
          provide: S3ReadStream,
          useValue: mockS3ReadStream,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: 'S3_BUCKET',
          useValue: 'test-bucket',
        },
      ],
    }).compile();

    service = module.get<DownloadService>(DownloadService);
    fileService = module.get<FileService>(FileService);
    s3Service = module.get<S3Service>(S3Service);
    permissionClient = module.get<PermissionClientService>(PermissionClientService);
    tokenService = module.get<TokenClientService>(TokenClientService);
    cacheService = module.get<CacheService>(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDownloadLinkAuthenticated', () => {
    it('should return presigned URL for authenticated user', async () => {
      const mockFile = {
        _id: 'file-id',
        key: 'uploads/images/test.jpg',
      };
      const mockPresignedUrl = 'https://s3.example.com/presigned-url';

      mockFileService.getFileById.mockResolvedValue(mockFile);
      mockPermissionClient.verifyUserAccess.mockResolvedValue(true);
      mockCacheService.cacheWrapper.mockResolvedValue(mockPresignedUrl);

      const result = await service.getDownloadLinkAuthenticated({
        fileId: 'file-id',
        userId: 1,
      });

      expect(result).toBe(mockPresignedUrl);
      expect(mockFileService.getFileById).toHaveBeenCalledWith('file-id');
      expect(mockPermissionClient.verifyUserAccess).toHaveBeenCalled();
      expect(mockCacheService.cacheWrapper).toHaveBeenCalled();
    });

    it('should throw NotFoundException if file does not exist', async () => {
      mockFileService.getFileById.mockRejectedValue(
        new NotFoundException('File does not exist'),
      );

      await expect(
        service.getDownloadLinkAuthenticated({
          fileId: 'non-existent',
          userId: 1,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('downloadFileByToken', () => {
    it('should return presigned URL for valid token', async () => {
      const mockTokenPayload = {
        resourceId: 'file-id',
        resourceType: 'file',
      };
      const mockFile = {
        _id: 'file-id',
        key: 'uploads/images/test.jpg',
      };
      const mockPresignedUrl = 'https://s3.example.com/presigned-url';

      mockTokenService.validateToken.mockResolvedValue(mockTokenPayload);
      mockFileService.getFileById.mockResolvedValue(mockFile);
      mockCacheService.cacheWrapper.mockResolvedValue(mockPresignedUrl);

      const result = await service.downloadFileByToken({
        downloadToken: 'valid-token',
      });

      expect(result).toBe(mockPresignedUrl);
      expect(mockTokenService.validateToken).toHaveBeenCalledWith('valid-token');
      expect(mockFileService.getFileById).toHaveBeenCalledWith('file-id');
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      mockTokenService.validateToken.mockResolvedValue(null);

      await expect(
        service.downloadFileByToken({
          downloadToken: 'invalid-token',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if resourceType is not file', async () => {
      const mockTokenPayload = {
        resourceId: 'file-id',
        resourceType: 'room',
      };

      mockTokenService.validateToken.mockResolvedValue(mockTokenPayload);

      await expect(
        service.downloadFileByToken({
          downloadToken: 'token',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getStream', () => {
    it('should return stream for valid key', async () => {
      const mockStream = { readable: true } as any;
      mockS3ReadStream.download.mockResolvedValue(mockStream);

      const result = await service.getStream('uploads/images/test.jpg');

      expect(result).toBe(mockStream);
      expect(mockS3ReadStream.download).toHaveBeenCalledWith('uploads/images/test.jpg');
    });
  });
});


