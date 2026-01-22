import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { SearchService } from '../services/search.service';
import { SearchDto } from '../dto/search.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-guard';
import type { RequestWithUser } from 'src/types/express';

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Post()
  async search(@Req() req: RequestWithUser, @Body() body: SearchDto) {
    return this.searchService.search(req.user.id, body);
  }
}
