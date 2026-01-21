import { IsString, IsOptional } from 'class-validator';

export class GetStructureDto {
  @IsString()
  storageId: string;

  @IsOptional()
  @IsString()
  parentId?: string | null;
}

