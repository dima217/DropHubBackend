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

        const mongoUrl = config.get<string>('MONGO_URL');
        
        if (mongoUrl) {
          return {
            uri: mongoUrl,
          };
        }

        let uri = 'mongodb://';
        
        if (mongoUsername && mongoPassword) {
          uri += `${encodeURIComponent(mongoUsername)}:${encodeURIComponent(mongoPassword)}@`;
        }
        
        uri += `${mongoHost}:${mongoPort}/${mongoDatabase}`;
        
        if (mongoAuthSource) {
          uri += `?authSource=${mongoAuthSource}`;
        }

        return {
          uri,
        };
      },
    }),
  ],
  exports: [MongooseModule],
})
export class MongoConfigModule {}

