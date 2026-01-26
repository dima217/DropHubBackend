import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { SearchService } from '../services/search.service';
import { SearchDto } from '../dto/search.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-guard';
import type { RequestWithUser } from 'src/types/express';

@ApiTags('Search')
@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Post()
  @ApiOperation({
    summary: 'Search resources',
    description: 'Searches for rooms and storage items based on query, tags, MIME type, creator, and resource type. Supports pagination.',
  })
  @ApiBody({ type: SearchDto })
  @ApiResponse({
    status: 200,
    description: 'Search results retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        rooms: {
          type: 'array',
          items: { type: 'object' },
        },
        storageItems: {
          type: 'array',
          items: { type: 'object' },
        },
        total: { type: 'number', example: 42 },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async search(@Req() req: RequestWithUser, @Body() body: SearchDto) {
    return this.searchService.search(req.user.id, body);
  }
}
