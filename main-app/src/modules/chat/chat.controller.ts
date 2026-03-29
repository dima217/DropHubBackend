import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateChannelDto, AddMembersDto, RemoveMemberDto } from './dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-guard';
import type { RequestWithUser } from 'src/types/express';

@Controller('api/chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @UseGuards(JwtAuthGuard)
  @Get('channels')
  getChannels(@Req() req: RequestWithUser) {
    return this.chatService.getChannels(req.user.id.toString());
  }

  @UseGuards(JwtAuthGuard)
  @Post('channels')
  createChannel(@Body() dto: CreateChannelDto, @Req() req: RequestWithUser) {
    return this.chatService.createChannel(dto, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('channels/:id/messages')
  getMessages(
    @Req() req: RequestWithUser,
    @Param('id') channelId: string,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    return this.chatService.getMessages(
      channelId,
      req.user.id.toString(),
      limit ? parseInt(limit, 10) : 50,
      before,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('channels/:id/members')
  getMembers(@Req() req: RequestWithUser, @Param('id') channelId: string) {
    return this.chatService.getMembers(channelId, req.user.id.toString());
  }

  @UseGuards(JwtAuthGuard)
  @Post('channels/:id/members')
  addMembers(
    @Req() req: RequestWithUser,
    @Param('id') channelId: string,
    @Body() dto: AddMembersDto,
  ) {
    return this.chatService.addMembers(channelId, req.user.id.toString(), dto.member_ids);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('channels/:id/members')
  removeMember(
    @Req() req: RequestWithUser,
    @Param('id') channelId: string,
    @Body() dto: RemoveMemberDto,
  ) {
    return this.chatService.removeMember(channelId, req.user.id.toString(), dto.user_id);
  }
}
