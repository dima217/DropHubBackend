import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ParticipantDto } from './participant.dto';

class UploadSessionDto {
  @ApiProperty({ example: 'upload_123', required: false })
  uploadId?: string;

  @ApiProperty({ example: 'ACTIVE' })
  status: string;
}

export class RoomDetailsDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  id: string;

  @ApiProperty({ type: [String], example: ['file1.pdf', 'file2.png'] })
  files: string[];

  @ApiProperty({ type: [String], example: ['group1', 'group2'] })
  groups: string[];

  @ApiProperty({ example: '2024-01-01T12:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ type: [String], example: ['user1', 'user2'] })
  participants: string[];

  @ApiPropertyOptional({ example: 'user-owner-id' })
  owner?: string;

  @ApiPropertyOptional({ example: '2024-12-31T23:59:59.000Z', nullable: true })
  expiresAt?: string | null;

  @ApiProperty({ example: 104857600 })
  maxBytes: number;

  @ApiProperty({ type: UploadSessionDto })
  uploadSession: UploadSessionDto;

  @ApiPropertyOptional({ example: 'ADMIN' })
  userRole?: string;

  // 🔥 расширение для details-endpoint
  @ApiProperty({
    type: [ParticipantDto],
    description: 'Detailed participants info',
  })
  participantsDetails: ParticipantDto[];
}
