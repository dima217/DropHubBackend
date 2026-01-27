import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { AvatarService } from "./avatar.service";

@Controller()
export class AvatarController {
  constructor(private readonly avatarService: AvatarService) {}

  @MessagePattern("avatar.getUploadUrl")
  async getUploadUrl(@Payload() data: { userId: string; contentType: string }) {
    const { userId, contentType } = data;
    return this.avatarService.getUploadUrl(userId, contentType);
  }

  @MessagePattern("avatar.getDownloadUrl")
  async getDownloadUrl(@Payload() data: { key: string }) {
    const { key } = data;
    return this.avatarService.getDownloadUrl(key);
  }

  @MessagePattern("avatar.getByUserIds")
  async getByUserIds(@Payload() data: { userIds: string[] }) {
    const { userIds } = data;
    return this.avatarService.getAvatarsByUserIds(userIds);
  }

  @MessagePattern("avatar.getDefaultAvatar")
  async getDefaultAvatar(@Payload() data: { number: number }) {
    const { number } = data;
    try {
      return await this.avatarService.getDefaultAvatar(number);
    } catch (error) {
      return { error: error.message };
    }
  }
}
