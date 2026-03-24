import { IsString, IsOptional, IsArray, IsIn } from 'class-validator';

export class CreateChannelDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsIn(['direct', 'group'])
  type: 'direct' | 'group';

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  member_ids: string[];
}
