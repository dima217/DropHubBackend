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

export class RoomFileResponseDto {
  @ApiProperty({ description: 'Room ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  _id: string;

  @ApiProperty({
    description: 'Files in the room',
    type: [FileMetaResponseDto],
    isArray: true,
  })
  files: FileMetaResponseDto[];

  @ApiProperty({
    description: 'Room expiration date',
    example: '2026-02-25T10:20:00.000Z',
    nullable: true,
    required: false,
  })
  expiresAt?: Date | null;
}

export class ArchiveRoomResponseDto {
  @ApiProperty({ description: 'Operation success status', example: true })
  success: boolean;

  @ApiProperty({
    description: 'ID of the created folder in storage',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  folderId: string;

  @ApiProperty({
    description: 'Number of files archived',
    example: 5,
  })
  filesArchived: number;

  @ApiProperty({
    description: 'Room ID that was archived',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  roomId: string;
}

export class DeleteFileResponseDto {
  @ApiProperty({ description: 'Operation success status', example: true })
  success: boolean;

  @ApiProperty({ description: 'Number of files updated/deleted', example: 3 })
  updated: number;
}