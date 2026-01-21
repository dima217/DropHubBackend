import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { CacheService } from '../../cache/cache.service';
import { z } from 'zod';

export enum AccessRole {
  ADMIN = 'admin',
  WRITE = 'write',
  READ = 'read',
}

export enum ResourceType {
  ROOM = 'room',
  STORAGE = 'storage',
  FILE = 'file',
  INVITE = 'invite',
}

interface VerifyAccessPayload {
  userId: number;
  resourceId: string;
  resourceType: ResourceType;
  requiredRoles: AccessRole[];
}

@Injectable()
export class PermissionClientService {
  private readonly PERMISSION_TTL = 60; // 1 минута
  private readonly permissionSchema = z.boolean();

  constructor(
    @Inject('PERMISSION_SERVICE') private readonly permissionClient: ClientProxy,
    private readonly cacheService: CacheService,
  ) {}

  async verifyUserAccess(
    userId: number,
    resourceId: string,
    resourceType: ResourceType,
    requiredRoles: AccessRole[],
  ): Promise<boolean> {
    const rolesKey = requiredRoles.sort().join(',');
    const cacheKey = `permission:${userId}:${resourceType}:${resourceId}:${rolesKey}`;

    return this.cacheService.cacheWrapper(
      cacheKey,
      async () => {
        try {
          const payload: VerifyAccessPayload = {
            userId,
            resourceId,
            resourceType,
            requiredRoles,
          };

          const result = await firstValueFrom(
            this.permissionClient.send('permission.verify', payload),
          );

          return result === true;
        } catch (error) {
          console.error('Permission verification error:', error);
          throw error;
        }
      },
      this.permissionSchema,
      this.PERMISSION_TTL,
    );
  }
}

