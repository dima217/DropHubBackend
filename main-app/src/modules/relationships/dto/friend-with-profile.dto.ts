import { Type } from 'class-transformer';
import { IsInt, IsString, IsUrl, ValidateNested } from 'class-validator';

export class FriendProfileDto {
  @IsInt()
  id: number;

  @IsUrl()
  avatarUrl: string;

  @IsString()
  firstName: string;
}

export class FriendWithProfileDto {
  @IsInt()
  friendshipId: number;

  @ValidateNested()
  @Type(() => FriendProfileDto)
  friendProfile: FriendProfileDto;
}
