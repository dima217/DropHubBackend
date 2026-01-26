import { Inject, Injectable } from "@nestjs/common";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Service } from "../s3/s3.service";
import { S3_BUCKET_AVATAR_TOKEN } from "../s3/s3.tokens";

@Injectable()
export class AvatarService {
  constructor(
    private readonly s3Service: S3Service,
    @Inject(S3_BUCKET_AVATAR_TOKEN) private readonly avatarBucket: string
  ) {}

  async getUploadUrl(userId: string, contentType: string) {
    const key = `avatars/${userId}-${Date.now()}`;
    const command = new PutObjectCommand({
      Bucket: this.avatarBucket,
      Key: key,
      ContentType: contentType,
    });

    const url = await getSignedUrl(this.s3Service.client, command, {
      expiresIn: 3600, // 1 час
    });

    return { url, key };
  }

  async getDownloadUrl(key: string) {
    const command = new GetObjectCommand({
      Bucket: this.avatarBucket,
      Key: key,
    });

    const url = await getSignedUrl(this.s3Service.client, command, {
      expiresIn: 3600,
    });

    return url;
  }

  async getAvatarsByUserIds(userIds: string[]) {
    const urls = await Promise.all(
      userIds.map(async (userId) => {
        const key = `avatars/${userId}`;
        return this.getDownloadUrl(key);
      })
    );
    return urls;
  }
}
