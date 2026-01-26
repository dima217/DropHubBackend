import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  Param,
  ParseIntPipe,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { SendRequestDto } from '../dto/friend-request.dto';
import { RelationshipsService } from '../services/relationships.service';
import type { RequestWithUser } from 'src/types/express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-guard';

@ApiTags('Relationships')
@Controller('relationships')
@UseGuards(JwtAuthGuard)
export class RelationshipsController {
  constructor(private readonly relationshipsService: RelationshipsService) {}

  @Post('request')
  @ApiOperation({
    summary: 'Send friend request',
    description: 'Sends a friend request to a user by email address. If user is not found, suggests sending an invitation email.',
  })
  @ApiBody({ type: SendRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Friend request sent successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Request has been sent.' },
        requestId: { type: 'number', example: 1 },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'User not found - invitation email suggested',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'User has not been found. Send invention Email.' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid email or request already exists' })
  async sendRequest(@Req() req: RequestWithUser, @Body() sendRequestDto: SendRequestDto) {
    const senderId = req.user.id;

    try {
      const request = await this.relationshipsService.sendFriendRequest(
        senderId,
        sendRequestDto.email,
      );
      return { message: 'Request has been sent.', requestId: request.id };
    } catch (error) {
      if (error instanceof NotFoundException && error.message.includes('Not found')) {
        return {
          message: 'User has not been found. Send invention Email.',
        };
      }
      throw error;
    }
  }

  @Post('accept/:requestId')
  @ApiOperation({
    summary: 'Accept friend request',
    description: 'Accepts a pending friend request. Only the receiver can accept the request.',
  })
  @ApiParam({ name: 'requestId', description: 'Friend request ID', type: Number, example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Friend request accepted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Request accepted.' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - not the receiver of the request' })
  @ApiResponse({ status: 404, description: 'Friend request not found' })
  async acceptRequest(
    @Req() req: RequestWithUser,
    @Param('requestId', ParseIntPipe) requestId: number,
  ) {
    const receiverId = req.user.id;
    await this.relationshipsService.acceptRequest(receiverId, requestId);
    return { message: 'Request accepted.' };
  }

  @Post('reject/:requestId')
  @ApiOperation({
    summary: 'Reject friend request',
    description: 'Rejects a pending friend request. Only the receiver can reject the request.',
  })
  @ApiParam({ name: 'requestId', description: 'Friend request ID', type: Number, example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Friend request rejected successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Request rejected.' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - not the receiver of the request' })
  @ApiResponse({ status: 404, description: 'Friend request not found' })
  async rejectRequest(
    @Req() req: RequestWithUser,
    @Param('requestId', ParseIntPipe) requestId: number,
  ) {
    const receiverId = req.user.id;
    await this.relationshipsService.rejectRequest(receiverId, requestId);
    return { message: 'Request rejected.' };
  }

  @Post('cancel/:requestId')
  @ApiOperation({
    summary: 'Cancel friend request',
    description: 'Cancels a pending friend request. Only the sender can cancel the request.',
  })
  @ApiParam({ name: 'requestId', description: 'Friend request ID', type: Number, example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Friend request canceled successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Request canceled.' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - not the sender of the request' })
  @ApiResponse({ status: 404, description: 'Friend request not found' })
  async cancelRequest(
    @Req() req: RequestWithUser,
    @Param('requestId', ParseIntPipe) requestId: number,
  ) {
    const senderId = req.user.id;
    await this.relationshipsService.cancelRequest(senderId, requestId);
    return { message: 'Request canceled.' };
  }
}
