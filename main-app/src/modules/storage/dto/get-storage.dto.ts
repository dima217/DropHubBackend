import { IsString, IsOptional } from 'class-validator';

export class GetStorageDto {
  @IsString()
  storageId: string;
}
