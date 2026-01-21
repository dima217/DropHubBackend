import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Profile } from '../entities/profile.entity';
import { UserUpdateProfileDTO } from '../dto/update-profile.dto';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
  ) {}

  async createProfileTransactional(
    data: Partial<Profile>,
    manager: EntityManager,
  ): Promise<Profile> {
    const profile = manager.create(Profile, data);
    return manager.save(profile);
  }

  async getProfileById(id: number): Promise<Profile> {
    const profile = await this.profileRepository.findOne({ where: { id } });
    if (!profile) throw new NotFoundException(`Profile with ID ${id} not found`);
    return profile;
  }

  async getProfileByUserId(userId: number): Promise<Profile> {
    const profile = await this.profileRepository.findOne({ where: { user: { id: userId } } });
    if (!profile) throw new NotFoundException(`Profile with ID ${userId} not found`);
    return profile;
  }

  /* async getContacts(profileId: number) {
    const profile = await this.profileRepository.findOne({
      where: { id: profileId },
      relations: ['contacts'],
    });
    return profile?.contacts || [];
  } */

  async updateProfile(profileId: number, dto: UserUpdateProfileDTO): Promise<Profile> {
    const profile = await this.getProfileById(profileId);

    /* if (dto.avatarUrl && dto.avatarUrl !== profile.avatarUrl && profile.avatarUrl) {
      await this.imageService.deleteFileFromStorage(profile.avatarUrl);
      profile.avatarUrl = dto.avatarUrl;
    } */

    if (dto.firstName) profile.firstName = dto.firstName;
    if (dto.lastName) profile.lastName = dto.lastName;

    return this.profileRepository.save(profile);
  }
}
