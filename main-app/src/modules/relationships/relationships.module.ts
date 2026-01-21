import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { RelationshipsController } from './controllers/relationships.controller';
import { FriendRequest } from './entities/friend-request.entity';
import { Friend } from './entities/friend.entity';
import { RelationshipsService } from './services/relationships.service';
import { FriendService } from './services/friend.service';
import { UserModule } from '../user/user.module';
import { CentrifugoModule } from '../notification/centrifugo.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FriendRequest, Friend]),
    PassportModule,
    UserModule,
    CentrifugoModule,
  ],
  controllers: [RelationshipsController],
  providers: [RelationshipsService, FriendService],
  exports: [FriendService, RelationshipsService],
})
export class RelationshipsModule {}
