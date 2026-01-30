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
import { FriendsGateway } from './gateway/friends.gateway';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FriendRequest, Friend]),
    PassportModule,
    UserModule,
    CentrifugoModule,
    UserModule,
    AuthModule,
  ],
  controllers: [RelationshipsController],
  providers: [RelationshipsService, FriendService, FriendsGateway],
  exports: [FriendService, RelationshipsService],
})
export class RelationshipsModule {}
