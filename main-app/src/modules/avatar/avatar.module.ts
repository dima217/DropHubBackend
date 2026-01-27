import { Module } from '@nestjs/common';
import { AvatarHttpController } from './controller/avatar.controller';
import { FileClientModule } from '@application/file-client';

@Module({
  controllers: [AvatarHttpController],
  imports: [FileClientModule],
})
export class AvatarModule {}
