import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { FileClientService } from '../../file-client/services/file-client.service';
import { GetPreviewDto } from '../dto/preview/get-preview.dto';
import type { RequestWithUser } from 'src/types/express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-guard';
import { PermissionGuard } from 'src/auth/guards/permission.guard';
import { RequirePermission } from 'src/auth/common/decorators/permission.decorator';
import { ResourceType, AccessRole } from 'src/modules/permission/entities/permission.entity';

@ApiTags('File Preview')
@Controller('/preview')
export class FilePreviewController {
  constructor(private readonly fileClient: FileClientService) {}

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(
    ResourceType.FILE,
    [AccessRole.ADMIN, AccessRole.READ, AccessRole.WRITE],
    'body',
    'fileId',
  )
  @Post('/url')
  @ApiOperation({
    summary: 'Get file preview URL',
    description: 'Generates a preview URL for a file (images, PDFs, etc.). Requires READ, WRITE, or ADMIN permission on the file.',
  })
  @ApiBody({ type: GetPreviewDto })
  @ApiResponse({
    status: 200,
    description: 'Preview URL generated successfully',
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string', example: 'https://s3.amazonaws.com/bucket/preview?presigned=...' },
        size: { type: 'number', example: 1024000, description: 'File size in bytes (for videos)' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getPreviewUrl(@Body() body: GetPreviewDto, @Req() req: RequestWithUser) {
    const result = await this.fileClient.getPreviewUrl(body.fileId, req.user.id);
    return result;
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(
    ResourceType.FILE,
    [AccessRole.ADMIN, AccessRole.READ, AccessRole.WRITE],
    'body',
    'fileId',
  )
  @Post('/video/thumbnail')
  @ApiOperation({
    summary: 'Get video thumbnail URL',
    description: 'Generates a thumbnail URL for a video file. Requires READ, WRITE, or ADMIN permission on the file.',
  })
  @ApiBody({ type: GetPreviewDto })
  @ApiResponse({
    status: 200,
    description: 'Thumbnail URL generated successfully',
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string', example: 'https://s3.amazonaws.com/bucket/thumbnail?presigned=...' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - file is not a video' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getVideoThumbnail(@Body() body: GetPreviewDto, @Req() req: RequestWithUser) {
    const result = await this.fileClient.getVideoThumbnailUrl(body.fileId, req.user.id);
    return result;
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(
    ResourceType.FILE,
    [AccessRole.ADMIN, AccessRole.READ, AccessRole.WRITE],
    'body',
    'fileId',
  )
  @Post('/video/stream')
  @ApiOperation({
    summary: 'Get video stream URL',
    description: 'Generates a streaming URL for a video file. Requires READ, WRITE, or ADMIN permission on the file.',
  })
  @ApiBody({ type: GetPreviewDto })
  @ApiResponse({
    status: 200,
    description: 'Video stream URL generated successfully',
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string', example: 'https://s3.amazonaws.com/bucket/video?presigned=...' },
        size: { type: 'number', example: 1024000, description: 'Video file size in bytes' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - file is not a video' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getVideoStream(@Body() body: GetPreviewDto, @Req() req: RequestWithUser) {
    const result = await this.fileClient.getVideoStreamUrl(body.fileId, req.user.id);
    return result;
  }
}
