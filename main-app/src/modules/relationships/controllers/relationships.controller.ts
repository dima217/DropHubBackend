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
import { SendRequestDto } from '../dto/friend-request.dto';
import { RelationshipsService } from '../services/relationships.service';
import type { RequestWithUser } from 'src/types/express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-guard';

@Controller('relationships')
@UseGuards(JwtAuthGuard)
export class RelationshipsController {
  constructor(private readonly relationshipsService: RelationshipsService) {}

  @Post('request')
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
  async acceptRequest(
    @Req() req: RequestWithUser,
    @Param('requestId', ParseIntPipe) requestId: number,
  ) {
    const receiverId = req.user.id;
    await this.relationshipsService.acceptRequest(receiverId, requestId);
    return { message: 'Request accepted.' };
  }

  @Post('reject/:requestId')
  async rejectRequest(
    @Req() req: RequestWithUser,
    @Param('requestId', ParseIntPipe) requestId: number,
  ) {
    const receiverId = req.user.id;
    await this.relationshipsService.rejectRequest(receiverId, requestId);
    return { message: 'Request rejected.' };
  }

  @Post('cancel/:requestId')
  async cancelRequest(
    @Req() req: RequestWithUser,
    @Param('requestId', ParseIntPipe) requestId: number,
  ) {
    const senderId = req.user.id;
    await this.relationshipsService.cancelRequest(senderId, requestId);
    return { message: 'Request canceled.' };
  }
}
