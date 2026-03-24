import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { Channel } from './entities/channel.entity';
import { ChannelMember } from './entities/channel-member.entity';
import { Message } from './entities/message.entity';
import { MessageReaction } from './entities/message-reaction.entity';
import { ReadCursor } from './entities/read-cursor.entity';
import { AuthModule } from 'src/auth/auth.module';
import { UserModule } from '@application/user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Channel, ChannelMember, Message, MessageReaction, ReadCursor]),
    AuthModule,
    UserModule,
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
})
export class ChatModule {}
