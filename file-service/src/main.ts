import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
      queue: 'file_service_queue',
      queueOptions: {
        durable: true,
      },
      prefetchCount: 1,
      persistent: true,
      socketOptions: {
        heartbeatIntervalInSeconds: 60,
        reconnectTimeInSeconds: 5,
      },
    },
  });

  app.useGlobalPipes(new ValidationPipe());

  await app.startAllMicroservices();

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`File Service is running on: ${port}`);
  console.log(`File Service microservice is listening on RabbitMQ queue: file_service_queue`);
}

bootstrap();
