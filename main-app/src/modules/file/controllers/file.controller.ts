import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { FileClientService } from '../../file-client/services/file-client.service';
import { DeleteFileDto } from '../dto/delete-file.dto';
import { GetFilesDto } from '../dto/get-files.dto';
import type { RequestWithUser } from 'src/types/express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-guard';

@Controller('file')
export class FileController {
  constructor(private readonly fileClient: FileClientService) {}

  @Post()
  async deleteFile(@Body() dto: DeleteFileDto) {
    const results = await this.fileClient.deleteFiles(dto.fileIds);
    return { success: true, updated: results.length };
  }

  @UseGuards(JwtAuthGuard)
  @Post('get-files')
  async getFiles(@Body() dto: GetFilesDto, @Req() req: RequestWithUser) {
    const files = await this.fileClient.getFilesByRoom(dto.roomId, req.user.id);
    return files;
  }
}
