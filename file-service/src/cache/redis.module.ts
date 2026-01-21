import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createClient } from 'redis';

type RedisClient = ReturnType<typeof createClient>;

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      inject: [ConfigService],
      useFactory: async (configService: ConfigService): Promise<RedisClient> => {
        const logger = new Logger('Redis');

        const host = configService.get<string>('REDIS_HOST');
        const port = Number(configService.get<string>('REDIS_PORT'));
        const password = configService.get<string>('REDIS_PASSWORD');

        logger.log(
          `Redis ENV → host=${host}, port=${port}, password=${password ? '***' : 'not set'}`,
        );

        const client = createClient({
          socket: {
            host,
            port,
          },
          password,
        });

        client.on('connect', () => {
          logger.log(`Redis connecting to ${host}:${port}...`);
        });

        client.on('ready', () => {
          logger.log(`Redis successfully connected to ${host}:${port}`);
        });

        client.on('error', (err) => {
          if (err instanceof Error) logger.error(`Redis error: ${err.message}`, err.stack);
        });

        await client.connect();

        return client;
      },
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule {}
