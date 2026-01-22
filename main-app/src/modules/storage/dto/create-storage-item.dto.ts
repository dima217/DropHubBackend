import { IsString, IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class CreateStorageItemDto {
  @IsString()
  @IsUUID('4')
  storageId: string;

  @IsString()
  name: string;

  @IsBoolean()
  isDirectory: boolean;

  @IsOptional()
  @IsString()
  @IsUUID('4')
  parentId?: string | null;

  @IsOptional()
  @IsString()
  @IsUUID('4')
  fileId?: string | null;
}

