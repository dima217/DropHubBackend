/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DatabaseExceptionFilter } from './exceptions/database-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  /* app.connectMicroservice<RmqOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [`amqp://rabbitmq:5672`],
      queue: 'create_charge_psp',
      prefetchCount: 1,
      persistent: true,
      noAck: false,
      queueOptions: {
        durable: true,
      },
      socketOptions: {
        heartbeatIntervalInSeconds: 60,
        reconnectTimeInSeconds: 5,
      },
    },
  });

  await app.startAllMicroservices(); */
  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalFilters(new DatabaseExceptionFilter());

  const configService = app.get(ConfigService);
  const swaggerConfig = configService.get('swagger');
  const environment = configService.get<string>('environment');

  // Enable Swagger if explicitly enabled or in development mode
  const shouldEnableSwagger = swaggerConfig?.enable === true || environment === 'development';

  if (shouldEnableSwagger) {
    const swaggerOptions = new DocumentBuilder()
      .setTitle(swaggerConfig?.title || 'API')
      .setDescription(swaggerConfig?.description || 'API Documentation')
      .setVersion(swaggerConfig?.version || '1.0')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerOptions);
    SwaggerModule.setup(swaggerConfig?.path || '/api-docs', app, document);
  }
  app.enableCors();
  const port = configService.get<number>('port') || 3000;
  await app.listen(port, '0.0.0.0');
}
bootstrap();

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
});
