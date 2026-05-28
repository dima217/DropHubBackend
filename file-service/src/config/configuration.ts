// configuration.ts
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { AppConfig } from './configuration.interface';

/** S3_ENDPOINT или http(s)://S3_HOST:S3_PORT (Railway: minio.railway.internal) */
export function resolveS3Endpoint(): string {
  const explicit = process.env.S3_ENDPOINT?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, '');
  }

  const host = process.env.S3_HOST?.trim() || 'localhost';
  const port = process.env.S3_PORT?.trim() || '9000';
  const useSsl =
    process.env.S3_USE_SSL === 'true' ||
    process.env.S3_SECURE === 'true' ||
    process.env.S3_PROTOCOL === 'https';

  const protocol = useSsl ? 'https' : 'http';
  return `${protocol}://${host}:${port}`;
}

export const configuration = (): AppConfig => {
  const config = plainToInstance(AppConfig, {
    environment: process.env.NODE_ENV || 'development',
    storageDefaultMaxBytes: parseInt(
      process.env.STORAGE_DEFAULT_MAX_BYTES || String(1024 * 1024 * 1024),
      10,
    ),
    port: parseInt(process.env.PORT || '3000', 10),
    mongo: {
      uri: process.env.MONGO_URL || '',
    },
    s3: {
      endpoint: resolveS3Endpoint(),
      region: process.env.S3_REGION || 'us-east-1',
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
