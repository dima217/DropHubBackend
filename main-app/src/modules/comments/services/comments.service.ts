import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Comment } from '../entities/comment.entity';
import { UniversalPermissionService } from '../../permission/services/permission.service';
import { ResourceType, AccessRole } from '../../permission/entities/permission.entity';
import { CreateCommentDto } from '../dto/create-comment.dto';
import { UpdateCommentDto } from '../dto/update-comment.dto';
import { GetCommentsDto } from '../dto/get-comments.dto';
import { UsersService } from '../../user/services/user.service';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    private readonly permissionService: UniversalPermissionService,
    private readonly userService: UsersService,
  ) {}

  async createComment(userId: number, dto: CreateCommentDto) {
    // Проверяем доступ к основному ресурсу (комната или storage)
    await this.permissionService.verifyUserAccess(userId, dto.resourceId, dto.resourceType, [
      AccessRole.ADMIN,
      AccessRole.READ,
      AccessRole.WRITE,
    ]);

    // Валидация: itemId только для STORAGE
    if (dto.itemId && dto.resourceType !== ResourceType.STORAGE) {
      throw new BadRequestException('itemId can only be used with STORAGE resource type');
    }

    // Валидация: fileId только для ROOM
    if (dto.fileId && dto.resourceType !== ResourceType.ROOM) {
      throw new BadRequestException('fileId can only be used with ROOM resource type');
    }

    // Нельзя указать и itemId и fileId одновременно
    if (dto.itemId && dto.fileId) {
      throw new BadRequestException('Cannot specify both itemId and fileId');
    }

    const comment = new Comment();
    comment.resourceId = dto.resourceId;
    comment.resourceType = dto.resourceType;
    comment.itemId = dto.itemId ?? undefined;
    comment.fileId = dto.fileId ?? undefined;
    comment.content = dto.content;
    comment.authorId = userId;

    return this.commentRepository.save(comment);
  }

  async updateComment(userId: number, commentId: string, dto: UpdateCommentDto) {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
      relations: ['author'],
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.authorId !== userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    comment.content = dto.content;
    comment.updatedAt = new Date();

    return this.commentRepository.save(comment);
  }

  async deleteComment(userId: number, commentId: string) {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
      relations: ['author'],
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    const isAuthor = comment.authorId === userId;
    let hasPermission = false;

    if (!isAuthor) {
      try {
        await this.permissionService.verifyUserAccess(
          userId,
          comment.resourceId,
          comment.resourceType,
          [AccessRole.ADMIN, AccessRole.WRITE],
        );
        hasPermission = true;
      } catch {
        hasPermission = false;
      }
    }

    if (!isAuthor && !hasPermission) {
      throw new ForbiddenException(
        'You can only delete your own comments or have ADMIN/WRITE access',
      );
    }

    await this.commentRepository.remove(comment);
    return { success: true };
  }

  async getComments(userId: number, dto: GetCommentsDto) {
    // Проверяем доступ к основному ресурсу (комната или storage)
    await this.permissionService.verifyUserAccess(userId, dto.resourceId, dto.resourceType, [
      AccessRole.ADMIN,
      AccessRole.READ,
      AccessRole.WRITE,
    ]);

    // Валидация: itemId только для STORAGE
    if (dto.itemId && dto.resourceType !== ResourceType.STORAGE) {
      throw new BadRequestException('itemId can only be used with STORAGE resource type');
    }

    // Валидация: fileId только для ROOM
    if (dto.fileId && dto.resourceType !== ResourceType.ROOM) {
      throw new BadRequestException('fileId can only be used with ROOM resource type');
    }

    // Строим условие поиска
    const where: {
      resourceId: string;
      resourceType: ResourceType;
      itemId?: string | ReturnType<typeof IsNull>;
      fileId?: string | ReturnType<typeof IsNull>;
    } = {
      resourceId: dto.resourceId,
      resourceType: dto.resourceType,
    };

    // Если указан itemId - ищем комментарии для конкретного элемента стора
    if (dto.itemId) {
      where.itemId = dto.itemId;
      where.fileId = IsNull();
    }
    // Если указан fileId - ищем комментарии для конкретного файла в комнате
    else if (dto.fileId) {
      where.fileId = dto.fileId;
      where.itemId = IsNull();
    }
    // Если ничего не указано - ищем комментарии для самого ресурса (комната или storage)
    else {
      where.itemId = IsNull();
      where.fileId = IsNull();
    }

    const comments = await this.commentRepository.find({
      where,
      relations: ['author', 'author.profile'],
      order: { createdAt: 'ASC' },
    });

    return comments.map((comment) => ({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      itemId: comment.itemId ?? null,
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      fileId: (comment.fileId ?? null) as string | null,
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
}
