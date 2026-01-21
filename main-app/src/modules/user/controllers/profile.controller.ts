import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ProfileService } from '../services/profile.service';
import { UserUpdateProfileDTO } from '../dto/update-profile.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-guard';
import type { RequestWithUser } from 'src/types/express';

@Controller('/profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Post('/update')
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
