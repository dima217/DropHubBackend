import { Module } from "@nestjs/common";
import { S3Service } from "./s3.service";
import { ConfigService } from "@nestjs/config";
import { S3_BUCKET_AVATAR_TOKEN, S3_BUCKET_TOKEN } from "./s3.tokens";

@Module({
  providers: [
    S3Service,
    {
      provide: S3_BUCKET_TOKEN,
      useFactory: (configService: ConfigService) => {
        return configService.get<string>("s3.bucket");
      },
      inject: [ConfigService],
    },
    {
      provide: S3_BUCKET_AVATAR_TOKEN,
      useFactory: (configService: ConfigService) =>
        configService.get<string>("s3.bucketAvatar"),
      inject: [ConfigService],
    },
  ],
  exports: [S3Service, S3_BUCKET_TOKEN, S3_BUCKET_AVATAR_TOKEN],
})
export class S3Module {}
export { S3_BUCKET_TOKEN };
