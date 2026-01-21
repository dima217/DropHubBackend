import { Module } from '@nestjs/common';
import { S3Service } from './s3.service';
import { ConfigService } from '@nestjs/config';
import { S3_BUCKET_TOKEN } from './s3.tokens';

@Module({
  providers: [
    S3Service,
    {
      provide: S3_BUCKET_TOKEN,
      useFactory: (configService: ConfigService) => {
        return configService.get<string>('s3.bucket');
      },
      inject: [ConfigService],
    },
  ],
  exports: [S3Service, S3_BUCKET_TOKEN],
})
export class S3Module {}
export { S3_BUCKET_TOKEN };
