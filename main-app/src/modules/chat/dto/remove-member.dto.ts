import { IsString } from 'class-validator';

export class RemoveMemberDto {
  @IsString()
  user_id: string;
}
