import { Controller, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { CommentsService } from '../services/comments.service';
import { CreateCommentDto } from '../dto/create-comment.dto';
import { UpdateCommentDto } from '../dto/update-comment.dto';
import { GetCommentsDto } from '../dto/get-comments.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-guard';
import type { RequestWithUser } from 'src/types/express';

@Controller('comments')
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  async createComment(@Req() req: RequestWithUser, @Body() body: CreateCommentDto) {
    return this.commentsService.createComment(req.user.id, body);
  }

  @Put(':commentId')
  async updateComment(
    @Req() req: RequestWithUser,
    @Param('commentId') commentId: string,
    @Body() body: UpdateCommentDto,
  ) {
    return this.commentsService.updateComment(req.user.id, commentId, body);
  }

  @Delete(':commentId')
  async deleteComment(@Req() req: RequestWithUser, @Param('commentId') commentId: string) {
    return this.commentsService.deleteComment(req.user.id, commentId);
  }

  @Post('get')
  async getComments(@Req() req: RequestWithUser, @Body() body: GetCommentsDto) {
    return this.commentsService.getComments(req.user.id, body);
  }
}
