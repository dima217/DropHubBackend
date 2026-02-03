import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from '../entities/comment.entity';
import { UniversalPermissionService } from '../../permission/services/permission.service';
import { AccessRole, ResourceType } from '../../permission/entities/permission.entity';
import { UpdateCommentDto } from '../dto/update-comment.dto';
import { GetCommentsDto } from '../dto/get-comments.dto';
import { CreateCommentDto } from '../dto/create-comment.dto';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    private readonly permissionService: UniversalPermissionService,
  ) {}

  async createComment(userId: number, dto: CreateCommentDto) {
    await this.permissionService.verifyUserAccess(userId, dto.roomId, ResourceType.ROOM, [
      AccessRole.ADMIN,
      AccessRole.READ,
      AccessRole.WRITE,
    ]);

    const comment = this.commentRepository.create({
      roomId: dto.roomId,
      content: dto.content,
      authorId: userId,
    });

    const savedComment = await this.commentRepository.save(comment);

    return this.commentRepository.findOne({
      where: { id: savedComment.id },
      relations: ['author', 'author.profile'], // profile если нужно
    });
  }

  async updateComment(userId: number, commentId: string, dto: UpdateCommentDto) {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.authorId !== userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    comment.content = dto.content;
    return this.commentRepository.save(comment);
  }

  async deleteComment(userId: number, commentId: string) {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    const isAuthor = comment.authorId === userId;

    if (!isAuthor) {
      await this.permissionService.verifyUserAccess(userId, comment.roomId, ResourceType.ROOM, [
        AccessRole.ADMIN,
        AccessRole.WRITE,
      ]);
    }

    await this.commentRepository.remove(comment);
    return { success: true };
  }

  async getComments(userId: number, dto: GetCommentsDto) {
    await this.permissionService.verifyUserAccess(userId, dto.roomId, ResourceType.ROOM, [
      AccessRole.ADMIN,
      AccessRole.READ,
      AccessRole.WRITE,
    ]);

    const comments = await this.commentRepository.find({
      where: { roomId: dto.roomId },
      relations: ['author', 'author.profile'],
      order: { createdAt: 'ASC' },
    });

    return comments.map((comment) => ({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      author: {
        id: comment.author.id,
        email: comment.author.email,
        profile: comment.author.profile
          ? {
              firstName: comment.author.profile.firstName,
              avatarUrl: comment.author.profile.avatarUrl,
            }
          : null,
      },
    }));
  }

  async findById(commentId: string) {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    return comment;
  }
}
