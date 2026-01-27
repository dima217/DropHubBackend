// configuration.ts
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { AppConfig } from './configuration.interface';

export const configuration = (): AppConfig => {
  const config = plainToInstance(AppConfig, {
    environment: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    mongo: {
      uri: process.env.MONGO_URL || '',
    },
    s3: {
      endpoint: process.env.S3_ENDPOINT,
      bucket: process.env.S3_BUCKET,
      bucketAvatar: process.env.S3_BUCKET_AVATAR || process.env.S3_BUCKET,
      accessKeyId: process.env.S3_ACCESS_KEY,
      secretAccessKey: process.env.S3_SECRET_KEY,
    },
    swagger: {
      title: process.env.SWAGGER_TITLE,
      description: process.env.SWAGGER_DESCRIPTION,
      version: process.env.SWAGGER_VERSION,
      path: process.env.SWAGGER_PATH,
      enable: process.env.ENABLE_SWAGGER,
    },
    redis: {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : undefined,
      password: process.env.REDIS_PASSWORD,
    },
  });

  const errors = validateSync(config);
  if (errors.length > 0) {
    throw new Error(`Config validation error: ${JSON.stringify(errors, null, 2)}`);
  }

  return config;
};
