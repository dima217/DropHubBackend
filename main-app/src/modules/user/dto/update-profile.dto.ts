import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UserUpdateProfileDTO {
  @ApiProperty({ description: 'User first name', required: false, example: 'John' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({
    description:
      'Key of the user avatar in S3/MinIO. The frontend should upload the file using this key to the storage service.',
    required: false,
    example: 'uploads/avatars/1679445678901-avatar.png',
  })
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
