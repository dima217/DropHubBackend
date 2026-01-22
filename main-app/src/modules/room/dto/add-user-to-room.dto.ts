import { IsString, IsNumber, IsEnum, IsOptional, IsArray, ArrayMinSize } from 'class-validator';
import { AccessRole } from 'src/modules/permission/entities/permission.entity';

export class AddUserToRoomDto {
  @IsString()
  roomId: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsNumber({}, { each: true })
  targetUserIds: number[];

  @IsOptional()
  @IsEnum(AccessRole)
  role?: AccessRole;
}
