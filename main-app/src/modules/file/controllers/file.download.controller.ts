import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import type { Response } from 'express';
import { FileClientService } from '../../file-client/services/file-client.service';
import { DownloadFileByTokenDto } from '../dto/download/download-file-token.dto';
import type { RequestWithUser } from 'src/types/express';
import { DownloadFileMultipartDto } from '../dto/download/download-file.multipart';
import { DownloadFileDto } from '../dto/download/download-file.dto';
import { Readable } from 'stream';
import { JwtAuthGuard } from 'src/auth/guards/jwt-guard';
import { PermissionGuard } from 'src/auth/guards/permission.guard';
import { RequirePermission } from 'src/auth/common/decorators/permission.decorator';
import { ResourceType, AccessRole } from 'src/modules/permission/entities/permission.entity';
import { DownloadRoomFileDto } from '../dto/download/download-file-room.dto';

@ApiTags('File Download')
@Controller('/download')
export class FileDownloadController {
  constructor(private readonly fileClient: FileClientService) {}

  @Post('/stream')
  @ApiOperation({
    summary: 'Download file stream',
    description: 'Downloads a file as a stream. The file is streamed directly to the response.',
  })
  @ApiBody({ type: DownloadFileMultipartDto })
  @ApiResponse({
    status: 200,
    description: 'File stream started',
    headers: {
      'Content-Type': { description: 'File MIME type', schema: { type: 'string' } },
      'Content-Disposition': { description: 'File attachment header', schema: { type: 'string' } },
    },
  })
  @ApiResponse({ status: 404, description: 'File not found' })
  async downloadFile(@Body() body: DownloadFileMultipartDto, @Res() res: Response) {
    const fileDoc = await this.fileClient.getFileByUploadId(body.uploadId);

    const mimeType = fileDoc?.mimeType || 'application/octet-stream';

    const stream = (await this.fileClient.getStream(fileDoc.key)) as Readable;

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileDoc.storedName}"`);

    stream.pipe(res);
  }

  @Post('/url-public')
  @ApiOperation({
    summary: 'Get public download URL',
    description:
      'Generates a presigned download URL for a file using a download token. This is a public endpoint.',
  })
  @ApiBody({ type: DownloadFileByTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Download URL generated successfully',
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string', example: 'https://s3.amazonaws.com/bucket/file?presigned=...' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid token' })
  async downloadFileByURL(@Body() body: DownloadFileByTokenDto) {
    const url = await this.fileClient.getDownloadLinkByToken(body.downloadToken);
    return { url };
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(
    ResourceType.FILE,
    [AccessRole.ADMIN, AccessRole.READ, AccessRole.WRITE],
    'body',
    'fileId',
  )
  @Post('/url-private')
  @ApiOperation({
    summary: 'Get private download URL',
    description:
      'Generates a presigned download URL for a file. Requires READ, WRITE, or ADMIN permission on the file.',
  })
  @ApiBody({ type: DownloadFileDto })
  @ApiResponse({
    status: 200,
    description: 'Download URL generated successfully',
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string', example: 'https://s3.amazonaws.com/bucket/file?presigned=...' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async downloadFileByURLPrivate(@Body() body: DownloadFileDto, @Req() req: RequestWithUser) {
    const urls = await this.fileClient.getDownloadLinks(body.fileIds, req.user.id);
    return urls;
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(
    ResourceType.ROOM,
    [AccessRole.ADMIN, AccessRole.READ, AccessRole.WRITE],
    'body',
    'roomId',
  )
  @Post('/url-private/room')
  @ApiOperation({
    summary: 'Get private download URL for a room file',
    description:
      'Generates a presigned download URL for a file located in a room. Requires READ, WRITE, or ADMIN permission on the room specified by `roomId`.',
  })
  @ApiBody({ type: DownloadRoomFileDto })
  @ApiResponse({
    status: 200,
    description: 'Download URL generated successfully',
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string', example: 'https://s3.amazonaws.com/bucket/file?presigned=...' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions on the room' })
  @ApiResponse({ status: 404, description: 'File not found in the room' })
  async downloadFileByURLPrivateRoom(
    @Body() body: DownloadRoomFileDto,
    @Req() req: RequestWithUser,
  ) {
    const urls = await this.fileClient.getDownloadLinks(body.fileIds, req.user.id);
    return urls;
  }
}
