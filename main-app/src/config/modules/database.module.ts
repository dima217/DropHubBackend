/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Module, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../configuration.interface';

const logger = new Logger('DatabaseModule');

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig>) => {
        const postgres = config.get('postgres');

        if (!postgres) throw new Error('Postgres config missing!');

        logger.log(`Connecting to Postgres with: 
          host=${postgres.host}, 
          port=${postgres.port}, 
          username=${postgres.username}, 
          database=${postgres.database}, 
          password=${postgres.password}`);

        return {
          type: 'postgres',
          host: postgres.host,
          port: postgres.port,
          username: postgres.username,
          password: postgres.password,
          database: postgres.database,
          autoLoadEntities: true,
          synchronize: true,
          retryAttempts: 10,
          retryDelay: 3000,
        };
      },
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
