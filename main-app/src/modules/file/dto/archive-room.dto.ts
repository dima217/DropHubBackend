import { IsArray, IsOptional, IsString } from 'class-validator';

export class ArchiveRoomDto {
  @IsString()
  roomId: string;

  @IsString()
  storageId: string;

  @IsOptional()
  @IsString()
  parentId: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fileIds?: string[];
}
