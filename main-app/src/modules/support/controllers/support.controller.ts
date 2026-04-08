import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SupportService } from '../services/support.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-guard';
import { RolesGuard } from 'src/auth/guards/roles-guard';
import { Roles } from 'src/auth/common/decorators/role.decorator';
import type { RequestWithUser } from 'src/types/express';
import { CreateSupportTicketDto } from '../dto/create-support-ticket.dto';
import { CreateAnonymousSupportTicketDto } from '../dto/create-anonymous-support-ticket.dto';
import { GetSupportTicketsAdminDto } from '../dto/admin/get-support-tickets-admin.dto';
import { RespondSupportTicketDto } from '../dto/admin/respond-support-ticket.dto';
import { UpdateSupportTicketStatusDto } from '../dto/admin/update-support-ticket-status.dto';

@ApiTags('Support')
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create support ticket as authorized user' })
  @ApiResponse({ status: 201, description: 'Support ticket created' })
  async createTicket(@Req() req: RequestWithUser, @Body() dto: CreateSupportTicketDto) {
    return this.supportService.createTicketByUser(req.user.id, dto);
  }

  @Post('anonymous')
  @ApiOperation({ summary: 'Create anonymous support ticket (no auth required)' })
  @ApiResponse({ status: 201, description: 'Anonymous support ticket created' })
  async createAnonymousTicket(@Body() dto: CreateAnonymousSupportTicketDto) {
    return this.supportService.createAnonymousTicket(dto);
  }

  @Get('anonymous/:id')
  @ApiOperation({ summary: 'Get anonymous support ticket by id and token' })
  async getAnonymousTicketById(@Param('id') id: string, @Query('token') token?: string) {
    if (!token) {
      throw new NotFoundException('Support ticket not found');
    }
    return this.supportService.getAnonymousTicketById(id, token);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user support tickets' })
  async getMyTickets(@Req() req: RequestWithUser) {
    return this.supportService.getMyTickets(req.user.id);
  }

  @Get('my/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user ticket by id' })
  async getMyTicketById(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.supportService.getMyTicketById(req.user.id, id);
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Admin: list support tickets' })
  async getAdminTickets(@Query() query: GetSupportTicketsAdminDto) {
    return this.supportService.getAdminTickets(query);
  }

  @Patch('admin/:id/respond')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Admin: respond to support ticket' })
  async respondTicket(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: RespondSupportTicketDto,
  ) {
    return this.supportService.respondTicket(id, req.user.id, dto.response, dto.status);
  }

  @Patch('admin/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Admin: update support ticket status' })
  async updateTicketStatus(@Param('id') id: string, @Body() dto: UpdateSupportTicketStatusDto) {
    return this.supportService.updateStatus(id, dto.status);
  }
}
