import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { RoomClientService } from '../../file-client/services/room-client.service';
import { UniversalPermissionService } from '../../permission/services/permission.service';
import { ResourceType, AccessRole, Permission } from '../../permission/entities/permission.entity';
import { RoomDto } from '../../file-client/types/room';
import { UsersService } from '../../user/services/user.service';
import { RoomDetailsDto } from '../dto/room.details.dto';
import { RoomsGateway } from '../gateway/room.gateway';
import { ParticipantDto, ParticipantProfileDto } from '../dto/participant.dto';

@Injectable()
export class RoomService {
  constructor(
    private readonly roomClient: RoomClientService,
    private readonly permissionService: UniversalPermissionService,
    private readonly userService: UsersService,
    private readonly roomsGateway: RoomsGateway,
  ) {}

  async createRoom(userId: number, username: string, expiresAt?: string) {
    const result = await this.roomClient.createRoom({ userId, username, expiresAt });

    await this.permissionService.createPermission({
      userId,
      resourceId: result.roomId,
      resourceType: ResourceType.ROOM,
      role: AccessRole.ADMIN,
    });

    this.roomClient.updateParticipantsCount(result.roomId, 1);

    return result;
  }

  async getRoomsByUserId(
    userId: number,
  ): Promise<Array<RoomDto & { userRole?: AccessRole; participantsDetails: ParticipantDto[] }>> {
    const permissions = await this.permissionService.getPermissionsByUserIdAndType(
      userId,
      ResourceType.ROOM,
    );

    if (permissions.length === 0) {
      return [];
    }

    const roomIds = permissions.map((p) => p.resourceId);

    const rooms = await this.roomClient.getRoomsByIds(roomIds);

    const roomsWithParticipants = await Promise.all(
      rooms.map(async (room) => {
        const participants = (await this.permissionService.getResourceParticipants(
          room.id,
          ResourceType.ROOM,
          this.userService,
        )) as
          | Array<{
              userId: number;
              role: AccessRole;
              email: string;
              profile: ParticipantProfileDto;
            }>
          | [];

        const permission = permissions.find((p) => p.resourceId === room.id);

        return {
          ...room,
          userRole: permission?.role,
          participantsDetails: participants,
        };
      }),
    );
    return roomsWithParticipants;
  }

  async addUsersToRoom(
    actingUserId: number,
    roomId: string,
    targetUserIds: number[],
    role?: AccessRole,
  ) {
    await this.permissionService.verifyUserAccess(actingUserId, roomId, ResourceType.ROOM, [
      AccessRole.ADMIN,
      AccessRole.WRITE,
    ]);

    const room: RoomDetailsDto | null = await this.roomClient.getRoomDetailsById(roomId);
    if (!room) {
      throw new NotFoundException('Room not found');
    }

    const defaultRole = role || AccessRole.WRITE;

    if (defaultRole === AccessRole.ADMIN) {
      throw new BadRequestException('Only room creator can have ADMIN role');
    }

    const results: {
      successful: number[];
      failed: Array<{ userId: number; reason: string }>;
    } = {
      successful: [],
      failed: [],
    };

    for (const targetUserId of targetUserIds) {
      try {
        await this.permissionService.grantPermission({
          actingUserId,
          targetUserId,
          resourceId: roomId,
          resourceType: ResourceType.ROOM,
          role: defaultRole,
        });
        results.successful.push(targetUserId);
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'Unknown error occurred';
        results.failed.push({ userId: targetUserId, reason });
      }
    }

    if (results.successful.length > 0) {
      const allPermissions = await this.permissionService.getPermissionsByResource(
        roomId,
        ResourceType.ROOM,
      );
      this.roomClient.updateParticipantsCount(roomId, allPermissions.length);
    }

    for (const newUserId of results.successful) {
      this.roomsGateway.sendAddedToRoom(newUserId, room);
    }
    this.roomsGateway.sendRoomUpdate(room.id);

    return {
      success: results.failed.length === 0,
      message:
        results.failed.length === 0
          ? `All ${results.successful.length} users added to room successfully`
          : `${results.successful.length} users added, ${results.failed.length} failed`,
      successful: results.successful,
      failed: results.failed,
    };
  }

  async removeUsersFromRoom(actingUserId: number, roomId: string, targetUserIds: number[]) {
    await this.permissionService.verifyUserAccess(actingUserId, roomId, ResourceType.ROOM, [
      AccessRole.ADMIN,
      AccessRole.WRITE,
    ]);

    const room: RoomDto | null = await this.roomClient.getRoomById(roomId);
    if (!room) {
      throw new NotFoundException('Room not found');
    }

    const results: {
      successful: number[];
      failed: Array<{ userId: number; reason: string }>;
    } = {
      successful: [],
      failed: [],
    };

    for (const targetUserId of targetUserIds) {
      try {
        const allPermissions = await this.permissionService.getPermissionsByUserId(targetUserId);
        const permissionsArray = Array.isArray(allPermissions) ? allPermissions : [];
        const targetPermission = permissionsArray.find(
          (p: Permission) => p.resourceId === roomId && p.resourceType === ResourceType.ROOM,
        );

        if (!targetPermission) {
          results.failed.push({
            userId: targetUserId,
            reason: 'User is not a member of this room',
          });
          continue;
        }

        if (targetPermission.role === AccessRole.ADMIN) {
          results.failed.push({
            userId: targetUserId,
            reason: 'Cannot remove room creator (ADMIN) from the room',
          });
          continue;
        }

        if (actingUserId === targetUserId) {
          const allActingPermissions =
            await this.permissionService.getPermissionsByUserId(actingUserId);
          const actingPermissionsArray = Array.isArray(allActingPermissions)
            ? allActingPermissions
            : [];
          const actingPermission = actingPermissionsArray.find(
            (p: Permission) => p.resourceId === roomId && p.resourceType === ResourceType.ROOM,
          );

          if (actingPermission?.role !== AccessRole.ADMIN) {
            results.failed.push({
              userId: targetUserId,
              reason: 'You cannot remove yourself from the room',
            });
            continue;
          }
        }

        await this.permissionService.revokePermission({
          actingUserId,
          targetUserId,
          resourceId: roomId,
          resourceType: ResourceType.ROOM,
        });

        results.successful.push(targetUserId);
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'Unknown error occurred';
        results.failed.push({ userId: targetUserId, reason });
      }
    }

    if (results.successful.length > 0) {
      const allPermissions = await this.permissionService.getPermissionsByResource(
        roomId,
        ResourceType.ROOM,
      );
      this.roomClient.updateParticipantsCount(roomId, allPermissions.length);
    }

    for (const userId of targetUserIds) {
      this.roomsGateway.sendRemovedFromRoom(userId, room.id);
    }
    this.roomsGateway.sendRoomUpdate(room.id);

    return {
      success: results.failed.length === 0,
      message:
        results.failed.length === 0
          ? `All ${results.successful.length} users removed from room successfully`
          : `${results.successful.length} users removed, ${results.failed.length} failed`,
      successful: results.successful,
      failed: results.failed,
    };
  }

  async getRoomDetails(userId: number, roomId: string) {
    await this.permissionService.verifyUserAccess(userId, roomId, ResourceType.ROOM, [
      AccessRole.ADMIN,
      AccessRole.READ,
      AccessRole.WRITE,
    ]);

    const room: RoomDetailsDto | null = await this.roomClient.getRoomDetailsById(roomId);
    if (!room) {
      throw new NotFoundException('Room not found');
    }

    const participants = (await this.permissionService.getResourceParticipants(
      roomId,
      ResourceType.ROOM,
      this.userService,
    )) as Array<{
      userId: number;
      role: AccessRole;
      email: string | null;
      profile: {
        firstName: string;
        avatarUrl: string | null;
      } | null;
    }>;

    return {
      ...room,
      participantsDetails: participants,
    } as RoomDetailsDto;
  }
}
