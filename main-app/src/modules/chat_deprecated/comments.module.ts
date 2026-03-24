import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommentsService } from './services/comments.service';
import { CommentsController } from './controllers/comments.controller';
import { Comment } from './entities/comment.entity';
import { PermissionModule } from '../permission/permission.module';
import { UserModule } from '../user/user.module';
import { CommentsGateway } from './gateway/comments.gateway';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Comment]), PermissionModule, UserModule, AuthModule],
  controllers: [CommentsController],
  providers: [CommentsService, CommentsGateway],
  exports: [CommentsService],
})
export class CommentsModule {}
