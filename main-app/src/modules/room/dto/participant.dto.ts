import { AccessRole } from '@application/permission/entities/permission.entity';
import { ApiProperty } from '@nestjs/swagger';

export class ParticipantProfileDto {
  @ApiProperty({ example: 'John' })
  firstName: string;

  @ApiProperty({ example: 'https://cdn.example.com/avatar.png', nullable: true })
  avatarUrl: string | null;
}

export class ParticipantDto {
  @ApiProperty({ example: 123 })
  userId: number;

  @ApiProperty({ enum: AccessRole, example: AccessRole.READ })
  role: AccessRole;

  @ApiProperty({ example: 'user@example.com', nullable: true })
  email: string | null;

  @ApiProperty({ type: ParticipantProfileDto, nullable: true })
  profile: ParticipantProfileDto | null;
}
