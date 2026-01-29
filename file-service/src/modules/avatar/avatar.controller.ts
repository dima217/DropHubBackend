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

  @MessagePattern("avatar.getAvatarsByKeys")
  async getAvatarsByKeys(@Payload() data: { keys: string[] }) {
    const { keys } = data;
    return this.avatarService.getAvatarsByKeys(keys);
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

  @MessagePattern("avatar.getAllDefaultAvatars")
  async getAllDefaultAvatars() {
    try {
      const result = await this.avatarService.getAllDefaultAvatars();
      return result;
    } catch (error) {
      console.error("Error in getAllDefaultAvatars:", error);
      return [];
    }
  }
}
