import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
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
    description: 'Updates the authenticated user profile information (first name, last name, avatar URL).',
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
        lastName: { type: 'string', example: 'Doe' },
        avatarUrl: { type: 'string', example: 'https://example.com/avatar.jpg' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async updateProfile(@Req() req: RequestWithUser, @Body() body: UserUpdateProfileDTO) {
    return this.profileService.updateProfile(req.user.profileId, body);
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
