import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { FileClientService } from '../../file-client/services/file-client.service';
import { DeleteFileDto } from '../dto/delete-file.dto';
import { GetFilesDto } from '../dto/get-files.dto';
import { ArchiveRoomDto } from '../dto/archive-room.dto';
import type { RequestWithUser } from 'src/types/express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-guard';
import { PermissionGuard } from 'src/auth/guards/permission.guard';
import { RequirePermission } from 'src/auth/common/decorators/permission.decorator';
import { ResourceType, AccessRole } from 'src/modules/permission/entities/permission.entity';

@ApiTags('Files')
@Controller('file')
export class FileController {
  constructor(private readonly fileClient: FileClientService) {}

  @Post()
  @ApiOperation({ summary: 'Delete files' })
  @ApiBody({ type: DeleteFileDto })
  @ApiResponse({ status: 200, description: 'Files deleted successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async deleteFile(@Body() dto: DeleteFileDto) {
    const results = await this.fileClient.deleteFiles(dto.fileIds);
    return { success: true, updated: results.length };
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(
    ResourceType.ROOM,
    [AccessRole.ADMIN, AccessRole.READ, AccessRole.WRITE],
    'body',
    'roomId',
  )
  @Post('get-files')
  @ApiOperation({ summary: 'Get all files in a room' })
  @ApiBody({ type: GetFilesDto })
  @ApiResponse({ status: 200, description: 'List of files in the room' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  async getFiles(@Body() dto: GetFilesDto, @Req() req: RequestWithUser) {
    const files = await this.fileClient.getFilesByRoom(dto.roomId, req.user.id);
    return files;
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
      "Archives selected files (or all files) from a room into the user's storage. Marks the room as archived.",
  })
  @ApiBody({ type: ArchiveRoomDto })
  @ApiResponse({ status: 200, description: 'Room archived successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Room or storage not found' })
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
