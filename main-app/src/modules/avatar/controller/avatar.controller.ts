import { Controller, Get, Param, ParseIntPipe, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { AvatarClientService } from '@application/file-client/services/auth/avatar-client.service';

@ApiTags('Avatars')
@Controller('avatars')
export class AvatarHttpController {
  constructor(private readonly avatarService: AvatarClientService) {}

  @Get('defaults')
  @ApiOperation({ summary: 'Get all default avatars (1-6)' })
  @ApiResponse({
    status: 200,
    description: 'List of default avatar URLs',
    schema: {
      example: ['https://s3.../default-1.png', 'https://s3.../default-2.png'],
    },
  })
  async getAllDefaultAvatars() {
    return this.avatarService.getAllDefaultAvatars();
  }

  @Get('defaults/:number')
  @ApiOperation({ summary: 'Get default avatar by number (1-6)' })
  @ApiParam({
    name: 'number',
    description: 'Default avatar number',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Signed URL of default avatar',
    schema: {
      example: 'https://s3.../default-1.png',
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid avatar number',
  })
  async getDefaultAvatar(@Param('number', ParseIntPipe) number: number) {
    try {
      return this.avatarService.getDefaultAvatar(number);
    } catch {
      throw new BadRequestException('Avatar number must be between 1 and 6');
    }
  }
}
