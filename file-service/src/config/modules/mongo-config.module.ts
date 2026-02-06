import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): MongooseModuleOptions => {
        const mongoHost = config.get<string>('MONGO_HOST') || 'localhost';
        const mongoPort = config.get<string>('MONGO_PORT') || '27017';
        const mongoDatabase = config.get<string>('MONGO_DATABASE') || 'file-service';
        const mongoUsername = config.get<string>('MONGO_USERNAME');
        const mongoPassword = config.get<string>('MONGO_PASSWORD');
        const mongoAuthSource = config.get<string>('MONGO_AUTH_SOURCE');
        const mongoReplicaSet = config.get<string>('MONGO_REPLICA_SET');
        const mongoUrl = config.get<string>('MONGO_URL');

        if (mongoUrl) {
          return { uri: mongoUrl };
        }

        let credentials = '';
        if (mongoUsername && mongoPassword) {
          credentials = `${encodeURIComponent(mongoUsername)}:${encodeURIComponent(mongoPassword)}@`;
        }

        const query: Record<string, string> = {};
        if (mongoAuthSource) query['authSource'] = mongoAuthSource;
        if (mongoReplicaSet) query['replicaSet'] = mongoReplicaSet;

        const queryString = Object.keys(query)
          .map(key => `${key}=${encodeURIComponent(query[key])}`)
          .join('&');

          const uri = `mongodb://${credentials}${mongoHost}:${mongoPort}/${mongoDatabase}${queryString ? `?${queryString}` : ''}`;

        return { uri };
      },
    }),
  ],
  exports: [MongooseModule],
})
export class MongoConfigModule {}
