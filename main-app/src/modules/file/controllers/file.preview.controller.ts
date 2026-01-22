import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { FileClientService } from '../../file-client/services/file-client.service';
import { GetPreviewDto } from '../dto/preview/get-preview.dto';
import type { RequestWithUser } from 'src/types/express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-guard';
import { PermissionGuard } from 'src/auth/guards/permission.guard';
import { RequirePermission } from 'src/auth/common/decorators/permission.decorator';
import { ResourceType, AccessRole } from 'src/modules/permission/entities/permission.entity';

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
  async getVideoStream(@Body() body: GetPreviewDto, @Req() req: RequestWithUser) {
    const result = await this.fileClient.getVideoStreamUrl(body.fileId, req.user.id);
    return result;
  }
}
