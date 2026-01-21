import { Test, TestingModule } from '@nestjs/testing';
import { ClientProxy } from '@nestjs/microservices';
import { of, throwError } from 'rxjs';
import { PermissionClientService, AccessRole, ResourceType } from './permission-client.service';
import { CacheService } from '../../cache/cache.service';

describe('PermissionClientService', () => {
  let service: PermissionClientService;
  let permissionClient: ClientProxy;
  let cacheService: CacheService;

  const mockClientProxy = {
    send: jest.fn(),
  };

  const mockCacheService = {
    cacheWrapper: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionClientService,
        {
          provide: 'PERMISSION_SERVICE',
          useValue: mockClientProxy,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<PermissionClientService>(PermissionClientService);
    permissionClient = module.get<ClientProxy>('PERMISSION_SERVICE');
    cacheService = module.get<CacheService>(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('verifyUserAccess', () => {
    it('should return true for authorized access', async () => {
      mockCacheService.cacheWrapper.mockImplementation(async (key, fn) => {
        return fn();
      });
      mockClientProxy.send.mockReturnValue(of(true));

      const result = await service.verifyUserAccess(
        1,
        'resource-id',
        ResourceType.ROOM,
        [AccessRole.ADMIN],
      );

      expect(result).toBe(true);
      expect(mockClientProxy.send).toHaveBeenCalledWith('permission.verify', {
        userId: 1,
        resourceId: 'resource-id',
        resourceType: ResourceType.ROOM,
        requiredRoles: [AccessRole.ADMIN],
      });
    });

    it('should return false for unauthorized access', async () => {
      mockCacheService.cacheWrapper.mockImplementation(async (key, fn) => {
        return fn();
      });
      mockClientProxy.send.mockReturnValue(of(false));

      const result = await service.verifyUserAccess(
        1,
        'resource-id',
        ResourceType.ROOM,
        [AccessRole.ADMIN],
      );

      expect(result).toBe(false);
    });

    it('should cache permission check result', async () => {
      mockCacheService.cacheWrapper.mockImplementation(async (key, fn) => {
        // First call - cache miss, call function
        const result = await fn();
        // Simulate caching
        mockCacheService.cacheWrapper.mockImplementation(async () => result);
        return result;
      });
      mockClientProxy.send.mockReturnValue(of(true));

      await service.verifyUserAccess(1, 'resource-id', ResourceType.ROOM, [AccessRole.ADMIN]);
      await service.verifyUserAccess(1, 'resource-id', ResourceType.ROOM, [AccessRole.ADMIN]);

      expect(mockCacheService.cacheWrapper).toHaveBeenCalled();
    });

    it('should handle errors from permission service', async () => {
      const error = new Error('Permission service error');
      mockCacheService.cacheWrapper.mockImplementation(async (key, fn) => {
        return fn();
      });
      mockClientProxy.send.mockReturnValue(throwError(() => error));

      await expect(
        service.verifyUserAccess(1, 'resource-id', ResourceType.ROOM, [AccessRole.ADMIN]),
      ).rejects.toThrow('Permission service error');
    });

    it('should create correct cache key with sorted roles', async () => {
      let capturedKey: string;
      mockCacheService.cacheWrapper.mockImplementation(async (key, fn) => {
        capturedKey = key;
        return fn();
      });
      mockClientProxy.send.mockReturnValue(of(true));

      await service.verifyUserAccess(1, 'resource-id', ResourceType.ROOM, [
        AccessRole.WRITE,
        AccessRole.ADMIN,
      ]);

      expect(capturedKey!).toContain('permission:1:room:resource-id:admin,write');
    });
  });
});


