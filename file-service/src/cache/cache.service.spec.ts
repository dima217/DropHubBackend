import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from './cache.service';
import { z } from 'zod';

describe('CacheService', () => {
  let service: CacheService;
  let mockRedisClient: any;

  beforeEach(async () => {
    mockRedisClient = {
      get: jest.fn(),
      setEx: jest.fn(),
      del: jest.fn(),
      keys: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: 'REDIS_CLIENT',
          useValue: mockRedisClient,
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('get', () => {
    const testSchema = z.object({ name: z.string(), age: z.number() });

    it('should return cached value if exists', async () => {
      const cachedValue = JSON.stringify({ name: 'Test', age: 25 });
      mockRedisClient.get.mockResolvedValue(cachedValue);

      const result = await service.get('test-key', testSchema);

      expect(result).toEqual({ name: 'Test', age: 25 });
      expect(mockRedisClient.get).toHaveBeenCalledWith('test-key');
    });

    it('should return undefined if key does not exist', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await service.get('non-existent-key', testSchema);

      expect(result).toBeUndefined();
      expect(mockRedisClient.get).toHaveBeenCalledWith('non-existent-key');
    });

    it('should throw error if cached value does not match schema', async () => {
      const invalidValue = JSON.stringify({ name: 'Test' }); // missing age
      mockRedisClient.get.mockResolvedValue(invalidValue);

      await expect(service.get('test-key', testSchema)).rejects.toThrow();
    });
  });

  describe('set', () => {
    it('should set value with default TTL', async () => {
      const value = { name: 'Test', age: 25 };
      mockRedisClient.setEx.mockResolvedValue('OK');

      await service.set('test-key', value);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'test-key',
        300, // default TTL
        JSON.stringify(value),
      );
    });

    it('should set value with custom TTL', async () => {
      const value = { name: 'Test', age: 25 };
      const customTTL = 600;
      mockRedisClient.setEx.mockResolvedValue('OK');

      await service.set('test-key', value, customTTL);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'test-key',
        customTTL,
        JSON.stringify(value),
      );
    });
  });

  describe('wrap', () => {
    const testSchema = z.object({ data: z.string() });

    it('should return cached value if exists', async () => {
      const cachedValue = JSON.stringify({ data: 'cached' });
      mockRedisClient.get.mockResolvedValue(cachedValue);
      const fn = jest.fn().mockResolvedValue({ data: 'new' });

      const result = await service.wrap('test-key', fn, testSchema);

      expect(result).toEqual({ data: 'cached' });
      expect(fn).not.toHaveBeenCalled();
      expect(mockRedisClient.setEx).not.toHaveBeenCalled();
    });

    it('should call function and cache result if not cached', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.setEx.mockResolvedValue('OK');
      const fn = jest.fn().mockResolvedValue({ data: 'new' });

      const result = await service.wrap('test-key', fn, testSchema, 100);

      expect(result).toEqual({ data: 'new' });
      expect(fn).toHaveBeenCalledTimes(1);
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'test-key',
        100,
        JSON.stringify({ data: 'new' }),
      );
    });
  });

  describe('delete', () => {
    it('should delete key from cache', async () => {
      mockRedisClient.del.mockResolvedValue(1);

      await service.delete('test-key');

      expect(mockRedisClient.del).toHaveBeenCalledWith('test-key');
    });
  });

  describe('deleteByPattern', () => {
    it('should delete all keys matching pattern', async () => {
      const keys = ['test:key1', 'test:key2', 'test:key3'];
      mockRedisClient.keys.mockResolvedValue(keys);
      mockRedisClient.del.mockResolvedValue(3);

      await service.deleteByPattern('test:*');

      expect(mockRedisClient.keys).toHaveBeenCalledWith('test:*');
      expect(mockRedisClient.del).toHaveBeenCalledWith(keys);
    });

    it('should not delete if no keys match pattern', async () => {
      mockRedisClient.keys.mockResolvedValue([]);

      await service.deleteByPattern('test:*');

      expect(mockRedisClient.keys).toHaveBeenCalledWith('test:*');
      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });
  });

  describe('cacheWrapper', () => {
    const testSchema = z.object({ data: z.string() });

    it('should return cached value if exists', async () => {
      const cachedValue = JSON.stringify({ data: 'cached' });
      mockRedisClient.get.mockResolvedValue(cachedValue);
      const fn = jest.fn().mockResolvedValue({ data: 'new' });

      const result = await service.cacheWrapper('test-key', fn, testSchema);

      expect(result).toEqual({ data: 'cached' });
      expect(fn).not.toHaveBeenCalled();
    });

    it('should call function if cache error occurs', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Redis error'));
      const fn = jest.fn().mockResolvedValue({ data: 'new' });

      const result = await service.cacheWrapper('test-key', fn, testSchema);

      expect(result).toEqual({ data: 'new' });
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should call function if cached value is invalid', async () => {
      const invalidValue = JSON.stringify({ invalid: 'data' });
      mockRedisClient.get.mockResolvedValue(invalidValue);
      const fn = jest.fn().mockResolvedValue({ data: 'new' });
      mockRedisClient.setEx.mockResolvedValue('OK');

      const result = await service.cacheWrapper('test-key', fn, testSchema);

      expect(result).toEqual({ data: 'new' });
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
});


