import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueueOptions } from 'bullmq';

@Module({
  imports: [
    BullModule.forRootAsync('bull-config', {
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): QueueOptions => {
        const redisHost = config.get<string>('REDIS_HOST') || 'localhost';
        const redisPort = parseInt(config.get<string>('REDIS_PORT') || '6379', 10);
        const redisPassword = config.get<string>('REDIS_PASSWORD');

        const connection: any = {
          host: redisHost,
          port: redisPort,
        };

        if (redisPassword) {
          connection.password = redisPassword;
        }

        return {
          connection,
        };
      },
    }),
  ],
  exports: [BullModule],
})
export class BullConfigModule {}

