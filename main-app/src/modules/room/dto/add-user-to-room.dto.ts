import { IsString, IsNumber, IsEnum, IsOptional, IsArray, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AccessRole } from 'src/modules/permission/entities/permission.entity';

export class AddUserToRoomDto {
  @ApiProperty({ description: 'Room ID', example: '507f1f77bcf86cd799439011' })
  @IsString()
  roomId: string;

  @ApiProperty({ description: 'Array of user IDs to add to the room', type: [Number], example: [1, 2, 3] })
  @IsArray()
  @ArrayMinSize(1)
  @IsNumber({}, { each: true })
  targetUserIds: number[];

  @ApiProperty({ description: 'Access role for the users (optional, defaults to READ)', enum: AccessRole, required: false })
  @IsOptional()
  @IsEnum(AccessRole)
  role?: AccessRole;
}
