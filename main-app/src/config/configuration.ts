import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { AppConfig } from './configuration.interface';

export const configuration = (): AppConfig => {
  const config = plainToInstance(AppConfig, {
    environment: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.APP_PORT || '3000', 10),

    postgres: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5555', 10),
      username: process.env.DB_USERNAME || 'myuser',
      password: process.env.DB_PASSWORD || 'mysecretpassword',
      database: process.env.DB_DATABASE || 'mydatabase',
    },

    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || '',
    },

    swagger: {
      title: process.env.SWAGGER_TITLE || 'Bet API',
      description: process.env.SWAGGER_DESCRIPTION || 'DropHub API',
      version: process.env.SWAGGER_VERSION || '1.0',
      path: process.env.SWAGGER_PATH || '/api-docs',
      enable: process.env.ENABLE_SWAGGER === 'true' || false,
    },

    mailer: {
      host: process.env.MAIL_HOST,
      port: process.env.MAIL_PORT,
      user: process.env.MAIL_USER,
      from: process.env.MAIL_FROM,
      secure: process.env.MAIL_SECURE,
      password: process.env.MAIL_PASSWORD,
    },
  });

  const errors = validateSync(config);
  if (errors.length > 0) {
    throw new Error(`Config validation error: ${errors.toString()}`);
  }

  return config;
};
