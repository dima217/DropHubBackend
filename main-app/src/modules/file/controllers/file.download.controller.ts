import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { FileClientService } from '../../file-client/services/file-client.service';
import { DownloadFileByTokenDto } from '../dto/download/download-file-token.dto';
import type { RequestWithUser } from 'src/types/express';
import { DownloadFileMultipartDto } from '../dto/download/download-file.multipart';
import { DownloadFileDto } from '../dto/download/download-file.dto';
import { Readable } from 'stream';
import { JwtAuthGuard } from 'src/auth/guards/jwt-guard';

@Controller('/download')
export class FileDownloadController {
  constructor(private readonly fileClient: FileClientService) {}

  @Post('/stream')
  async downloadFile(@Body() body: DownloadFileMultipartDto, @Res() res: Response) {
    const fileDoc = await this.fileClient.getFileByUploadId(body.uploadId);

    const mimeType = fileDoc?.mimeType || 'application/octet-stream';

    const stream = (await this.fileClient.getStream(fileDoc.key)) as Readable;

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileDoc.storedName}"`);

    stream.pipe(res);
  }

  @Post('/url-public')
  async downloadFileByURL(@Body() body: DownloadFileByTokenDto) {
    const url = await this.fileClient.getDownloadLinkByToken(body.downloadToken);
    return { url };
  }

  @UseGuards(JwtAuthGuard)
  @Post('/url-private')
  async downloadFileByURLPrivate(@Body() body: DownloadFileDto, @Req() req: RequestWithUser) {
    const url = await this.fileClient.getDownloadLink(body.fileId, req.user.id);
    return { url };
  }
}
