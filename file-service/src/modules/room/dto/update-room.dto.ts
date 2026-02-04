import { IsOptional, IsString } from "class-validator";

export class UpdateRoomDto {
  @IsString()
  roomId: string;

  @IsString()
  @IsOptional()
  owner?: string;
}
