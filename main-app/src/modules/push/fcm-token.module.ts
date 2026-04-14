import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@application/user/entities/user.entity';
import { FcmTokenService } from './fcm-token.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [FcmTokenService],
  exports: [FcmTokenService],
})
export class FcmTokenModule {}
