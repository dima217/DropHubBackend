import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Profile } from '../entities/profile.entity';
import { UserUpdateProfileDTO } from '../dto/update-profile.dto';
import { AvatarClientService } from '@application/file-client/services/auth/avatar-client.service';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
    private avatarClientService: AvatarClientService,
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

  async findByFirstName(firstName: string): Promise<Profile | null> {
    return this.profileRepository.findOne({
      where: { firstName },
    });
  }

  async searchProfilesByName(query: string, limit: number = 10): Promise<Profile[]> {
    return this.profileRepository
      .createQueryBuilder('profile')
      .where('LOWER(profile.firstName) LIKE LOWER(:query)', { query: `%${query}%` })
      .take(limit)
      .getMany();
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

  async uploadAvatar(userId: number) {
    const { url, publicUrl } = await this.avatarClientService.getUploadUrl({
      userId: userId.toString(),
      contentType: 'image/png',
    });
    return { uploadUrl: url, publicUrl: publicUrl };
  }

  async updateProfile(profileId: number, dto: UserUpdateProfileDTO): Promise<Profile> {
    const profile = await this.getProfileById(profileId);

    /* if (dto.avatarUrl && dto.avatarUrl !== profile.avatarUrl && profile.avatarUrl) {
      await this.imageService.deleteFileFromStorage(profile.avatarUrl);
      profile.avatarUrl = dto.avatarUrl;
    } */

    if (dto.firstName) profile.firstName = dto.firstName;
    if (dto.avatarUrl) profile.avatarUrl = dto.avatarUrl;

    return this.profileRepository.save(profile);
  }
}
