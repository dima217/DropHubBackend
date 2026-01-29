import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AvatarClientService } from '@application/file-client/services/auth/avatar-client.service';

@ApiTags('Avatars')
@Controller('avatars')
export class AvatarHttpController {
  constructor(private readonly avatarService: AvatarClientService) {}

  @Get('defaults')
  @ApiOperation({ summary: 'Get all default avatars (1-6)' })
  async getAllDefaultAvatars() {
    return this.avatarService.getAllDefaultAvatars();
  }

  @Get('defaults/:number')
  @ApiOperation({ summary: 'Get default avatar by number (1-6)' })
  @ApiParam({ name: 'number', example: 1 })
  async getDefaultAvatar(@Param('number', ParseIntPipe) number: number) {
    try {
      return await this.avatarService.getDefaultAvatar(number);
    } catch {
      throw new BadRequestException('Avatar number must be between 1 and 6');
    }
  }

  @Post('upload-url')
  @ApiOperation({ summary: 'Get signed upload URL for avatar' })
  @ApiBody({
    schema: {
      example: {
        userId: 'user-123',
        contentType: 'image/png',
      },
    },
  })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        url: 'https://s3...signed-put-url',
        key: 'avatars/user-123-1690000000.png',
      },
    },
  })
  async getUploadUrl(
    @Body()
    body: {
      userId: string;
      contentType: string;
    },
  ) {
    if (!body.userId || !body.contentType) {
      throw new BadRequestException('userId and contentType are required');
    }

    return this.avatarService.getUploadUrl({
      userId: body.userId,
      contentType: body.contentType,
    });
  }
}
