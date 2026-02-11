import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Service } from "../s3/s3.service";
import { S3_BUCKET_AVATAR_TOKEN } from "../s3/s3.tokens";
import * as fs from "fs";
import * as path from "path";

@Injectable()
export class AvatarService implements OnModuleInit {
  private defaultAvatarKeys: string[] = [];
  private defaultAvatarUrls: string[] = [];

  constructor(
    private readonly s3Service: S3Service,
    @Inject(S3_BUCKET_AVATAR_TOKEN) private readonly avatarBucket: string
  ) {}

  async onModuleInit() {
    const defaultDir = path.join(process.cwd(), "default-avatars");
    if (!fs.existsSync(defaultDir)) {
      console.warn("Default avatars folder not found:", defaultDir);
      return;
    }
    const files = fs
      .readdirSync(defaultDir)
      .filter((f) => f.match(/\.(png|jpg|jpeg)$/));
    if (!files.length) {
      console.warn("No default avatar files found in:", defaultDir);
      return;
    }

    for (let i = 0; i < 6; i++) {
      const file = files[i];
      if (!file) break;
      const filePath = path.join(defaultDir, file);
      const fileContent = fs.readFileSync(filePath);
      const key = `avatars/default-${i + 1}${path.extname(file)}`;

      const command = new PutObjectCommand({
        Bucket: this.avatarBucket,
        Key: key,
        Body: fileContent,
        ContentType: `image/${path.extname(file).replace(".", "")}`,
      });

      await this.s3Service.client.send(command);
      this.defaultAvatarKeys[i] = key;
    }
    this.defaultAvatarUrls = await Promise.all(
      this.defaultAvatarKeys.map((key) => this.getPublicUrl(key))
    );
  }

  async getDefaultAvatar(number: number) {
    if (number < 1 || number > this.defaultAvatarKeys.length) {
      throw new Error("Invalid default avatar number. Must be 1-6.");
    }
    const url = this.defaultAvatarUrls[number - 1];
    if (!url) {
      const key = this.defaultAvatarKeys[number - 1];
      return this.getPublicUrl(key);
    }
    return { url: url };
  }

  private getPublicUrl(key: string): string {
    return `http://10.78.194.195:9000/${this.avatarBucket}/${key}`;
  }

  async getUploadUrl(userId: string, contentType: string) {
    const key = `avatars/${userId}-${Date.now()}`;
    const command = new PutObjectCommand({
      Bucket: this.avatarBucket,
      Key: key,
      ContentType: contentType,
    });

    const url = await getSignedUrl(this.s3Service.client, command, {
      expiresIn: 3600,
    });
    return { url: url, key: key, publicUrl: this.getPublicUrl(key) };
  }

  async getAvatarsByKeys(keys: string[]) {
    const urls = await Promise.all(
      keys.map(async (key) => {
        const defaultMatch = key.match(/^default-(\d+)$/);
        if (defaultMatch) {
          const index = parseInt(defaultMatch[1], 10);
          try {
            return await this.getDefaultAvatar(index);
          } catch (err) {
            console.warn(`Default avatar ${index} not found`);
            return null;
          }
        }
        return this.getPublicUrl(key);
      })
    );
    return { urls: urls };
  }

  async getAllDefaultAvatars(): Promise<string[]> {
    if (!this.defaultAvatarUrls.length) {
      console.warn("Default avatar URLs are not initialized");
      return [];
    }
    return this.defaultAvatarUrls;
  }
}
