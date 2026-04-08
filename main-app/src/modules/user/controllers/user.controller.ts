import { Controller, Get, Body, Param, Delete, Put, UseGuards, Query, Patch } from '@nestjs/common';
import { UsersService } from '../services/user.service';
import { UpdateUserDto } from '../dto/update-user.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { User } from '../entities/user.entity';
import { JwtAuthGuard } from 'src/auth/guards/jwt-guard';
import { RolesGuard } from 'src/auth/guards/roles-guard';
import { Roles } from 'src/auth/common/decorators/role.decorator';
import { GetUsersAdminDto } from '../dto/admin/get-users-admin.dto';
import { BanUserDto } from '../dto/admin/ban-user.dto';
import { GetAdminStatsDto } from '../dto/admin/get-admin-stats.dto';
import { AdminStatisticsService } from '../services/admin-statistics.service';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UsersService,
    private readonly adminStatisticsService: AdminStatisticsService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('admin/list')
  @ApiOperation({ summary: 'Admin: get users list with pagination and email search' })
  @ApiResponse({ status: 200, description: 'Paginated users list' })
  @Roles('admin')
  async getAdminUsers(@Query() query: GetUsersAdminDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [users, total] = await this.userService.findAllAdminList({
      page,
      limit,
      email: query.email,
    });

    return {
      items: users.map((user) => ({
        id: user.id,
        uuid: user.uuid,
        email: user.email,
        role: user.role,
        isBanned: user.isBanned,
        isOAuthUser: user.isOAuthUser,
        profile: user.profile ?? null,
      })),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch('admin/:id/ban')
  @ApiOperation({ summary: 'Admin: ban or unban user' })
  @ApiParam({ name: 'id', type: 'integer', description: 'User ID' })
  @ApiBody({ type: BanUserDto })
  @ApiResponse({ status: 200, description: 'User ban status updated' })
  @Roles('admin')
  async setUserBan(@Param('id') id: string, @Body() body: BanUserDto) {
    const user = await this.userService.setBanStatus(+id, body.isBanned);
    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        isBanned: user.isBanned,
      },
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('admin/statistics')
  @ApiOperation({ summary: 'Admin: platform behavior statistics' })
  @ApiResponse({ status: 200, description: 'Aggregated admin statistics' })
  @Roles('admin')
  async getAdminStatistics(@Query() query: GetAdminStatsDto) {
    return this.adminStatisticsService.getDashboardStats(query.days ?? 30, query.top ?? 10);
  }

  //Admin endpoint
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiParam({ name: 'id', type: 'integer', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Successful request', type: User })
  @ApiResponse({ status: 404, description: 'User not found' })
  @Roles('admin')
  findOne(@Param('id') id: string) {
    return this.userService.getUserById(+id);
  }

  //User endpoint
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Put(':id')
  @ApiOperation({ summary: 'Update a user' })
  @ApiParam({ name: 'id', type: 'integer', description: 'User ID' })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({
    status: 200,
    description: 'User successfully updated',
    type: User,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @Roles('admin')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.updateUser(+id, updateUserDto);
  }

  //Admin endpoint
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user' })
  @ApiParam({ name: 'id', type: 'integer', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User deleted' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.userService.remove(+id);
  }
}
