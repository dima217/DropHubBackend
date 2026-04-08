import { AccessRole } from '@application/permission/entities/permission.entity';
import { ApiProperty } from '@nestjs/swagger';

export class FileMetaResponseDto {
  @ApiProperty({ description: 'File ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  _id: string;

  @ApiProperty({ description: 'Original file name', example: 'document.pdf' })
  originalName: string;

  @ApiProperty({ description: 'Stored file name', example: 'stored_document_123.pdf' })
  storedName: string;

  @ApiProperty({ description: 'File size in bytes', example: 1048576 })
  size: number;

  @ApiProperty({ description: 'MIME type', example: 'application/pdf' })
  mimeType: string;

  @ApiProperty({ description: 'Upload time', example: '2026-01-25T10:20:00.000Z' })
  uploadTime: Date;

  @ApiProperty({ description: 'Download count', example: 5 })
  downloadCount: number;

  @ApiProperty({ description: 'Creator user ID', example: 1, required: false })
  creatorId?: number;
}

export class CreatorProfileInfoDto {
  @ApiProperty({ description: 'Profile ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'User display name', example: 'John Doe' })
  firstName: string;

  @ApiProperty({
    description: 'URL of the avatar image',
    example: 'https://example.com/avatar.jpg',
    nullable: true,
    required: false,
  })
  avatarUrl: string | null;
}

export class CreatorInfoDto {
  @ApiProperty({ description: 'Creator user ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'Creator email address', example: 'creator@example.com' })
  email: string;

  @ApiProperty({
    description: 'Creator profile information',
    type: CreatorProfileInfoDto,
    nullable: true,
    required: false,
  })
  profile: CreatorProfileInfoDto | null;
}

export class StorageItemResponseDto {
  @ApiProperty({ description: 'Item ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ description: 'User role', example: 'admin', required: false })
  userRole?: AccessRole;

  @ApiProperty({ description: 'User ID who owns the item', example: '1' })
  userId: string;

  @ApiProperty({ description: 'Item name', example: 'My Folder' })
  name: string;

  @ApiProperty({ description: 'Storage ID', example: '123e4567-e89b-12d3-a456-426614174001' })
  storageId: string;

  @ApiProperty({ description: 'Whether the item is a directory', example: true })
  isDirectory: boolean;

  @ApiProperty({
    description: 'Parent item ID (null for root level)',
    example: '123e4567-e89b-12d3-a456-426614174002',
    nullable: true,
  })
  parentId: string | null;

  @ApiProperty({
    description: 'File ID (only for files, not directories)',
    example: '123e4567-e89b-12d3-a456-426614174003',
    nullable: true,
    required: false,
  })
  fileId?: string | null;

  @ApiProperty({ description: 'Creator user ID', example: 1, required: false })
  creatorId?: number;

  @ApiProperty({
    description: 'Tags associated with the item',
    example: ['work', 'important'],
    type: [String],
    required: false,
  })
  tags?: string[];

  @ApiProperty({
    description: 'Deletion timestamp (null if not deleted)',
    example: null,
    nullable: true,
    required: false,
  })
  deletedAt?: string | null;

  @ApiProperty({
    description:
      'Scheduled hard-delete timestamp after permanent delete from trash (admin recovery window end)',
    example: '2026-04-18T10:20:00.000Z',
    nullable: true,
    required: false,
  })
  permanentDeleteAt?: string | null;

  // For directories
  @ApiProperty({
    description: 'Total number of children (only for directories)',
    example: 10,
    required: false,
  })
  childrenCount?: number;

  @ApiProperty({
    description: 'Number of files in directory (only for directories)',
    example: 7,
    required: false,
  })
  filesCount?: number;

  @ApiProperty({
    description: 'Number of folders in directory (only for directories)',
    example: 3,
    required: false,
  })
  foldersCount?: number;

  // For files
  @ApiProperty({
    description: 'File metadata (only for files)',
    type: FileMetaResponseDto,
    required: false,
  })
  fileMeta?: FileMetaResponseDto;

  @ApiProperty({
    description:
      'Creator information with id, email and profile (firstName, avatarUrl). ' +
      'Present primarily for shared items responses.',
    type: CreatorInfoDto,
    nullable: true,
    required: false,
  })
  creator?: CreatorInfoDto | null;
}

export class StorageResponseDto {
  @ApiProperty({ description: 'Storage ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({
    description: 'Tags associated with the storage',
    example: ['work', 'important'],
    type: [String],
    required: false,
  })
  tags?: string[];

  @ApiProperty({ description: 'Creation timestamp', example: '2026-01-25T10:20:00.000Z' })
  createdAt: string;

  @ApiProperty({ description: 'Maximum storage size in bytes', example: 1073741824 })
  maxBytes: number;
}

export class DeleteItemResponseDto {
  @ApiProperty({ description: 'Operation success status', example: true })
  success: boolean;

  @ApiProperty({ description: 'Deleted item ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  itemId: string;
}
