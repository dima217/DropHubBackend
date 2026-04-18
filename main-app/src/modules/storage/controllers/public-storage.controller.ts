import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { StorageClientService } from '../../file-client/services/storage-client.service';
import { StorageItemResponseDto } from '../dto/responses/storage-item-response.dto';

@ApiTags('Public Storage')
@Controller('public/storage')
export class PublicStorageController {
  constructor(private readonly storageClient: StorageClientService) {}

  @Get(':token')
  @ApiOperation({
    summary: 'Get storage item by public token',
    description:
      'Retrieves a storage item using a public share token. This endpoint does not require authentication and can be used to share storage items publicly. The token must be valid and grant at least READ access. If the item is a directory, its children are also included in the response.',
  })
  @ApiParam({
    name: 'token',
    description: 'Public share token for the storage item',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @ApiResponse({
    status: 200,
    description: 'Storage item retrieved successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(StorageItemResponseDto) },
        {
          type: 'object',
          properties: {
            children: {
              type: 'array',
              items: { $ref: getSchemaPath(StorageItemResponseDto) },
              description: 'Children items (only for directories)',
            },
          },
        },
      ],
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - token is invalid, expired, or does not grant read access',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - token does not grant sufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Item not found or token is invalid' })
  async getItemByToken(@Param('token') token: string) {
    return this.storageClient.getStorageItemByToken(token);
  }
}
