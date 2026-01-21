import { NestFactory } from '@nestjs/core';
import { FileCleanAppModule } from './file.queue.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(FileCleanAppModule);
  console.log('File cleanup worker running...');
}
bootstrap();

