import { Body, Controller, Post, UseInterceptors, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import type { Request } from 'express';
import { FileClientService } from '../../file-client/services/file-client.service';
import { UploadInitMultipartDto } from '../dto/upload/upload-init-multipart.dto';
import { UploadCompleteDto } from '../dto/upload/upload-complete.dto';
import type { RequestWithUser } from 'src/types/express';
import { UploadByTokenDto } from '../dto/upload/upload-token.dto';
import { UploadToRoomDto } from '../dto/upload/upload-room.dto';
import { UploadToStorageDto } from '../dto/upload/upload-storage.dto';
import { UserIpInterceptor } from 'src/common/interceptors/user.ip.interceptor';
import { JwtAuthGuard } from 'src/auth/guards/jwt-guard';
import { PermissionGuard } from 'src/auth/guards/permission.guard';
import { RequirePermission } from 'src/auth/common/decorators/permission.decorator';
import { ResourceType, AccessRole } from 'src/modules/permission/entities/permission.entity';

@ApiTags('File Upload')
@Controller('/upload')
export class FileUploadController {
  constructor(private readonly fileClient: FileClientService) {}

  @Post('auth/room')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(ResourceType.ROOM, [AccessRole.ADMIN, AccessRole.WRITE], 'body', 'roomId')
  @UseInterceptors(UserIpInterceptor)
  @ApiOperation({
    summary: 'Upload file to room (authenticated)',
    description: 'Uploads a file to a room. Requires ADMIN or WRITE permission on the room. Returns S3 presigned URL for direct upload.',
  })
  @ApiBody({ type: UploadToRoomDto })
  @ApiResponse({
    status: 200,
    description: 'Upload URL generated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        url: { type: 'string', example: 'https://s3.amazonaws.com/bucket/file?presigned=...' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  async uploadFileToRoomAuthenticated(
    @Body() s3UploadData: UploadToRoomDto,
    @Req() req: RequestWithUser,
  ) {
    const uploadData = {
      ...s3UploadData,
      uploaderIp: req.userIp,
      userId: req.user.id,
    };

    const result = await this.fileClient.uploadFileToRoom(uploadData);
    return { success: true, url: result.url };
  }

  @Post('auth/storage')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(
    ResourceType.STORAGE,
    [AccessRole.ADMIN, AccessRole.WRITE],
    'body',
    'storageId',
  )
  @UseInterceptors(UserIpInterceptor)
  @ApiOperation({
    summary: 'Upload file to storage (authenticated)',
    description: 'Uploads a file to user storage. Requires ADMIN or WRITE permission on the storage. Returns S3 presigned URL for direct upload.',
  })
  @ApiBody({ type: UploadToStorageDto })
  @ApiResponse({
    status: 200,
    description: 'Upload URL generated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        url: { type: 'string', example: 'https://s3.amazonaws.com/bucket/file?presigned=...' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Storage not found' })
  async uploadFileToStorageAuthenticated(
    @Body() s3UploadData: UploadToStorageDto,
    @Req() req: RequestWithUser,
  ) {
    const uploadData = {
      ...s3UploadData,
      uploaderIp: req.userIp,
      userId: req.user.id,
    };

    const result = await this.fileClient.uploadFileToStorage(uploadData);
    return { success: true, url: result.url };
  }

  @Post('public')
  @UseInterceptors(UserIpInterceptor)
  @ApiOperation({
    summary: 'Upload file by token (public)',
    description: 'Uploads a file using an upload token. This is a public endpoint that does not require authentication.',
  })
  @ApiBody({ type: UploadByTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Upload URL generated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        url: { type: 'string', example: 'https://s3.amazonaws.com/bucket/file?presigned=...' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid token or data' })
  async uploadFilePublic(@Body() s3UploadData: UploadByTokenDto, @Req() req: Request) {
    const uploadData = {
      ...s3UploadData,
      uploaderIp: req.userIp,
    };

    const result = await this.fileClient.uploadFileByToken(uploadData);
    return { success: true, url: result.url };
  }

  @Post('multipart/init')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(ResourceType.ROOM, [AccessRole.ADMIN, AccessRole.WRITE], 'body', 'roomId')
  @UseInterceptors(UserIpInterceptor)
  @ApiOperation({
    summary: 'Initialize multipart upload',
    description: 'Initializes a multipart upload for large files. Returns presigned URLs for each part. Requires ADMIN or WRITE permission on the room.',
  })
  @ApiBody({ type: UploadInitMultipartDto })
  @ApiResponse({
    status: 200,
    description: 'Multipart upload initialized successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            uploadId: { type: 'string', example: 'abc123' },
            parts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  partNumber: { type: 'number', example: 1 },
                  url: { type: 'string', example: 'https://s3.amazonaws.com/bucket/file?presigned=...' },
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async uploadMultipartInit(@Body() body: UploadInitMultipartDto, @Req() req: RequestWithUser) {
    const initRes = await this.fileClient.initMultipartUpload({
      ...body,
      userId: req.user.id,
      ip: req.userIp,
    });
    return { success: true, data: initRes };
  }

  @Post('multipart/complete')
  @ApiOperation({
    summary: 'Complete multipart upload',
    description: 'Completes a multipart upload by combining all uploaded parts into a single file.',
  })
  @ApiBody({ type: UploadCompleteDto })
  @ApiResponse({
    status: 200,
    description: 'Multipart upload completed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Multipart upload completed' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid parts or upload ID' })
  async uploadComplete(@Body() body: UploadCompleteDto) {
    await this.fileClient.completeMultipartUpload(body);
    return { success: true, message: 'Multipart upload completed' };
  }
}
