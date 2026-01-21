import { Body, Controller, Post, UseInterceptors, Req, UseGuards } from '@nestjs/common';
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

@Controller('/upload')
export class FileUploadController {
  constructor(private readonly fileClient: FileClientService) {}

  @Post('auth/room')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(UserIpInterceptor)
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
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(UserIpInterceptor)
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
  async uploadFilePublic(@Body() s3UploadData: UploadByTokenDto, @Req() req: Request) {
    const uploadData = {
      ...s3UploadData,
      uploaderIp: req.userIp,
    };

    const result = await this.fileClient.uploadFileByToken(uploadData);
    return { success: true, url: result.url };
  }

  @Post('multipart/init')
  async uploadMultipartInit(@Body() body: UploadInitMultipartDto) {
    const initRes = await this.fileClient.initMultipartUpload(body);
    return { success: true, data: initRes };
  }

  @Post('multipart/complete')
  async uploadComplete(@Body() body: UploadCompleteDto) {
    await this.fileClient.completeMultipartUpload(body);
    return { success: true, message: 'Multipart upload completed' };
  }
}
