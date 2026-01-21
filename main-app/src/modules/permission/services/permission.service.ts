import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccessRole, Permission, ResourceType } from '../entities/permission.entity';
import { CacheService } from 'src/cache/cache.service';
import { PermissionSchema, PermissionType } from '../schemas/permission.schema';

interface CreatePermissionParams {
  userId: number;
  resourceId: string;
  resourceType: ResourceType;
  role: AccessRole;
}

interface GrantPermissionParams {
  actingUserId: number;
  targetUserId: number;
  resourceId: string;
  resourceType: ResourceType;
  role: AccessRole;
}

interface RevokePermissionParams {
  actingUserId: number;
  targetUserId: number;
  resourceId: string;
  resourceType: ResourceType;
}

@Injectable()
export class UniversalPermissionService {
  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    private readonly cacheService: CacheService,
  ) {}

  async createPermission(params: CreatePermissionParams) {
    return this.permissionRepository.save({
      resourceId: params.resourceId,
      resourceType: params.resourceType,
      role: params.role,
      user: { id: params.userId },
    } as Permission);
  }

  async grantPermission(params: GrantPermissionParams): Promise<Permission> {
    const { actingUserId, targetUserId, resourceId, resourceType, role } = params;

    await this._verifyActionPermission(actingUserId, targetUserId, resourceId, resourceType);

    const existingPermission = await this.permissionRepository.findOne({
      where: { user: { id: targetUserId }, resourceId, resourceType },
    });

    if (existingPermission) {
      existingPermission.role = role;
      return this.permissionRepository.save(existingPermission);
    }

    const newPermission = this.permissionRepository.create({
      user: { id: targetUserId },
      resourceId,
      resourceType,
      role,
    });

    return this.permissionRepository.save(newPermission);
  }

  async revokePermission(params: RevokePermissionParams): Promise<void> {
    const { actingUserId, targetUserId, resourceId, resourceType } = params;

    await this._verifyActionPermission(actingUserId, targetUserId, resourceId, resourceType);

    const permission = await this.permissionRepository.findOne({
      where: { user: { id: targetUserId }, resourceId, resourceType },
    });

    if (!permission) {
      throw new NotFoundException('Permission not found for the target user.');
    }

    await this.permissionRepository.remove(permission);
  }

  async getPermissionsByUserIdAndType(userId: number, resourceType: ResourceType) {
    return this.permissionRepository.find({
      where: { user: { id: userId }, resourceType: resourceType },
    });
  }

  async getPermissionsByUserId(userId: number) {
    const cached = await this.cacheService.get<PermissionType>(
      `permission:${userId}`,
      PermissionSchema,
    );
    if (cached) return cached;
    return this.permissionRepository.find({
      where: { user: { id: userId } },
    });
  }

  async deletePermissionsByResource(resourceId: string, resourceType: ResourceType): Promise<void> {
    await this.permissionRepository.delete({ resourceId, resourceType });
  }

  async verifyUserAccess(
    userId: number,
    resourceId: string,
    resourceType: ResourceType,
    requiredRoles: AccessRole[],
  ): Promise<boolean> {
    const permission = await this.permissionRepository.findOne({
      where: { user: { id: userId }, resourceId, resourceType },
    });

    if (!permission) {
      throw new NotFoundException(
        `Resource (Type: ${resourceType}, ID: ${resourceId}) not found or no permission.`,
      );
    }

    if (!requiredRoles.includes(permission.role)) {
      throw new ForbiddenException('You do not have access to perform this action.');
    }

    return true;
  }

  async ensureAdminPermissionExists(
    resourceId: string,
    resourceType: ResourceType,
    userId: number,
  ) {
    await this.verifyUserAccess(userId, resourceId, resourceType, [
      AccessRole.ADMIN,
      AccessRole.WRITE,
    ]);
  }

  private async _verifyActionPermission(
    actingUserId: number,
    targetUserId: number,
    resourceId: string,
    resourceType: ResourceType,
  ): Promise<void> {
    const canAct = await this.verifyUserAccess(actingUserId, resourceId, resourceType, [
      AccessRole.ADMIN,
      AccessRole.WRITE,
    ]);

    if (!canAct) {
      throw new UnauthorizedException('You are not authorized to modify permissions.');
    }

    if (actingUserId === targetUserId) {
      throw new ConflictException('You cannot modify your own permissions.');
    }
  }
}
