import { Controller, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { CommentsService } from '../services/comments.service';
import { CreateCommentDto } from '../dto/create-comment.dto';
import { UpdateCommentDto } from '../dto/update-comment.dto';
import { GetCommentsDto } from '../dto/get-comments.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-guard';
import type { RequestWithUser } from 'src/types/express';

@ApiTags('Comments')
@Controller('comments')
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a comment',
    description: 'Creates a new comment on a resource (room, storage item, or file).',
  })
  @ApiBody({ type: CreateCommentDto })
  @ApiResponse({
    status: 201,
    description: 'Comment created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1 },
        content: { type: 'string', example: 'This is a comment' },
        resourceId: { type: 'string', example: '507f1f77bcf86cd799439011' },
        resourceType: { type: 'string', example: 'ROOM' },
        creatorId: { type: 'number', example: 1 },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createComment(@Req() req: RequestWithUser, @Body() body: CreateCommentDto) {
    return this.commentsService.createComment(req.user.id, body);
  }

  @Put(':commentId')
  @ApiOperation({
    summary: 'Update a comment',
    description: 'Updates an existing comment. Only the comment creator can update it.',
  })
  @ApiParam({ name: 'commentId', description: 'Comment ID', example: '1' })
  @ApiBody({ type: UpdateCommentDto })
  @ApiResponse({
    status: 200,
    description: 'Comment updated successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1 },
        content: { type: 'string', example: 'This is an updated comment' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - not the comment creator' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async updateComment(
    @Req() req: RequestWithUser,
    @Param('commentId') commentId: string,
    @Body() body: UpdateCommentDto,
  ) {
    return this.commentsService.updateComment(req.user.id, commentId, body);
  }

  @Delete(':commentId')
  @ApiOperation({
    summary: 'Delete a comment',
    description: 'Deletes a comment. Only the comment creator can delete it.',
  })
  @ApiParam({ name: 'commentId', description: 'Comment ID', example: '1' })
  @ApiResponse({
    status: 200,
    description: 'Comment deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Comment deleted' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - not the comment creator' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async deleteComment(@Req() req: RequestWithUser, @Param('commentId') commentId: string) {
    return this.commentsService.deleteComment(req.user.id, commentId);
  }

  @Post('get')
  @ApiOperation({
    summary: 'Get comments',
    description: 'Retrieves all comments for a specific resource (room, storage item, or file).',
  })
  @ApiBody({ type: GetCommentsDto })
  @ApiResponse({
    status: 200,
    description: 'Comments retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        comments: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 1 },
              content: { type: 'string', example: 'This is a comment' },
              creatorId: { type: 'number', example: 1 },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getComments(@Req() req: RequestWithUser, @Body() body: GetCommentsDto) {
    return this.commentsService.getComments(req.user.id, body);
  }
}
