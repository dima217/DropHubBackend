import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ResourceType } from 'src/modules/permission/entities/permission.entity';

export class CreateCommentDto {
  @IsString()
  resourceId: string;

  @IsEnum(ResourceType)
  resourceType: ResourceType;

  @IsOptional()
  @IsString()
  itemId?: string; // Для элементов стора

  @IsOptional()
  @IsString()
  fileId?: string; // Для файлов в комнатах

  @IsString()
  content: string;
}
