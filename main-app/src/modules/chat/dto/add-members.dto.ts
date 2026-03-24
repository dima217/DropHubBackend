import { IsArray, IsString } from 'class-validator';

export class AddMembersDto {
  @IsArray()
  @IsString({ each: true })
  member_ids: string[];
}
