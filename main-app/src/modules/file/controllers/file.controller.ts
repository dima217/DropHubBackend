import { Body, Controller, Delete, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
import { FileClientService } from '../../file-client/services/file-client.service';
import { DeleteFileDto } from '../dto/delete-file.dto';
import { GetFilesDto } from '../dto/get-files.dto';
import { ArchiveRoomDto } from '../dto/archive-room.dto';
import {
  DeleteFileResponseDto,
  RoomFileResponseDto,
  ArchiveRoomResponseDto,
} from '../dto/responses/file-response.dto';
import type { RequestWithUser } from 'src/types/express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-guard';
import { PermissionGuard } from 'src/auth/guards/permission.guard';
import { RequirePermission } from 'src/auth/common/decorators/permission.decorator';
import { ResourceType, AccessRole } from 'src/modules/permission/entities/permission.entity';
import { UpdateFileDto } from '../dto/update-file.dto';
import { RoomsGateway } from '@application/room/gateway/room.gateway';

@ApiTags('Files')
@ApiExtraModels(DeleteFileResponseDto, RoomFileResponseDto, ArchiveRoomResponseDto)
@Controller('file')
export class FileController {
  constructor(
    private readonly fileClient: FileClientService,
    private readonly roomGateway: RoomsGateway,
  ) {}

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(
    ResourceType.ROOM,
    [AccessRole.ADMIN, AccessRole.READ, AccessRole.WRITE],
    'body',
    'roomId',
  )
  @Delete()
  @ApiOperation({
    summary: 'Delete files',
    description:
      'Deletes one or more files from the system. This operation marks files as deleted but does not immediately remove them from storage. Files are identified by their file IDs. This endpoint does not require authentication, but file access is controlled by permissions.',
  })
  @ApiBody({ type: DeleteFileDto })
  @ApiResponse({
    status: 200,
    description: 'Files deleted successfully',
    schema: { $ref: getSchemaPath(DeleteFileResponseDto) },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - fileIds array is empty or invalid',
  })
  @ApiResponse({
    status: 404,
    description: 'One or more files not found',
  })
  async deleteFiles(@Body() dto: DeleteFileDto) {
    const success = await this.fileClient.deleteFiles(dto.fileIds, dto.roomId);
    return success;
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(
    ResourceType.ROOM,
    [AccessRole.ADMIN, AccessRole.READ, AccessRole.WRITE],
    'body',
    'roomId',
  )
  @Post('get-files')
  @ApiOperation({
    summary: 'Get all files in a room',
    description:
      'Retrieves all files associated with a specific room. Returns file metadata including name, size, MIME type, upload time, and download count. Requires READ, WRITE, or ADMIN permissions on the room.',
  })
  @ApiBody({ type: GetFilesDto })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved list of files in the room',
    schema: { $ref: getSchemaPath(RoomFileResponseDto) },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - roomId is missing or invalid',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user does not have READ, WRITE, or ADMIN permissions on the room',
  })
  @ApiResponse({ status: 404, description: 'Room not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing JWT token' })
  async getFiles(@Body() dto: GetFilesDto, @Req() req: RequestWithUser) {
    const files = await this.fileClient.getFilesByRoom(dto.roomId, req.user.id);
    return files;
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(
    ResourceType.ROOM,
    [AccessRole.ADMIN, AccessRole.READ, AccessRole.WRITE],
    'body',
    'roomId',
  )
  @Post('/update')
  async updateFile(@Body() dto: UpdateFileDto) {
    const result = await this.fileClient.updateRoomFile(dto);
    if (result) {
      this.roomGateway.sendRoomUpdate(result.roomId);
    }
    return result;
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(ResourceType.ROOM, [AccessRole.ADMIN, AccessRole.WRITE], 'body', 'roomId')
  @RequirePermission(
    ResourceType.STORAGE,
    [AccessRole.ADMIN, AccessRole.WRITE],
    'body',
    'storageId',
  )
  @Post('archive-room')
  @ApiOperation({
    summary: 'Archive a room into user storage',
    description:
      "Archives selected files (or all files if fileIds is not provided) from a room into the user's storage. Creates a new folder in the storage with the room's name (or a default name) and copies the selected files into it. The room is marked as archived after successful archiving. Requires WRITE or ADMIN permissions on both the room and the target storage. If parentId is not provided, files are archived to the root level of the storage.",
  })
  @ApiBody({ type: ArchiveRoomDto })
  @ApiResponse({
    status: 200,
    description: 'Room archived successfully',
    schema: { $ref: getSchemaPath(ArchiveRoomResponseDto) },
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - roomId, storageId is missing, room is already archived, or invalid parentId',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user does not have WRITE or ADMIN permissions on the room or storage',
  })
  @ApiResponse({
    status: 404,
    description: 'Room, storage, parent folder, or one or more files not found',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing JWT token' })
  async archiveRoom(@Body() dto: ArchiveRoomDto, @Req() req: RequestWithUser) {
    return await this.fileClient.archiveRoom({
      roomId: dto.roomId,
      storageId: dto.storageId,
      parentId: dto.parentId ?? null,
      userId: req.user.id,
      fileIds: dto.fileIds,
    });
  }
}
