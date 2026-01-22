import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ResourceType } from 'src/modules/permission/entities/permission.entity';

export class GetCommentsDto {
  @IsString()
  resourceId: string;

  @IsEnum(ResourceType)
  resourceType: ResourceType;

  @IsOptional()
  @IsString()
  itemId?: string;

  @IsOptional()
  @IsString()
  fileId?: string;
}
