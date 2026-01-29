import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ProfileService } from '../services/profile.service';
import { UserUpdateProfileDTO } from '../dto/update-profile.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-guard';
import type { RequestWithUser } from 'src/types/express';

@ApiTags('Profile')
@Controller('/profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Post('/update')
  @ApiOperation({
    summary: 'Update user profile',
    description:
      'Updates the authenticated user profile information (first name, last name, avatar URL).',
  })
  @ApiBody({ type: UserUpdateProfileDTO })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1 },
        firstName: { type: 'string', example: 'John' },
        avatarUrl: {
          type: 'string',
          example: 'https://minio.example.com/bucket-name/avatars/user-123.jpg',
          description: 'URL аватара в S3/MinIO хранилище',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async updateProfile(@Req() req: RequestWithUser, @Body() body: UserUpdateProfileDTO) {
    return this.profileService.updateProfile(req.user.profileId, body);
  }

  @Get('/search')
  @ApiOperation({
    summary: 'Search profiles by name',
    description:
      'Searches for profiles by first name (partial match, case-insensitive). Returns maximum 10 results.',
  })
  @ApiQuery({
    name: 'query',
    type: String,
    description: 'Search query for profile first name',
    example: 'г',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Profiles found successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number', example: 1 },
          firstName: { type: 'string', example: 'Григорий' },
          avatarUrl: { type: 'string', nullable: true, example: 'https://...' },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid query parameter' })
  async searchProfiles(@Query('query') query: string) {
    if (!query || query.trim().length === 0) {
      throw new HttpException('Query parameter is required', HttpStatus.BAD_REQUEST);
    }
    return this.profileService.searchProfilesByName(query.trim(), 10);
  }

  @Get('/upload-url')
  @ApiOperation({ summary: 'Get upload URL for user avatar' })
  @ApiParam({ name: 'userId', type: Number, description: 'ID of the user' })
  @ApiResponse({
    status: 200,
    description: 'Upload URL retrieved successfully',
    schema: { example: { url: 'https://...', key: 'avatar-key.png' } },
  })
  @ApiResponse({ status: 400, description: 'Invalid userId' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getUploadAvatarUrl(@Req() req: RequestWithUser) {
    try {
      return await this.profileService.uploadAvatar(req.user.id);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Failed to get upload URL', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /* @Post('/add-contact')
  async addContact(@Req() req: RequestWithUser, @Body() body: ContactDto) {
    this.profileService.addContact(req.user.profileId, body.contactId);
  }

  @Post('/remove-contact')
  async removeContact(@Req() req: RequestWithUser, @Body() body: ContactDto) {
    this.profileService.removeContact(req.user.profileId, body.contactId);
  } */
}
