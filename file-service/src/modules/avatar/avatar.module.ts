import { Module } from "@nestjs/common";
import { S3Module } from "../s3/s3.module";
import { AvatarService } from "./avatar.service";

@Module({
  imports: [S3Module],
  providers: [AvatarService],
  exports: [AvatarService],
})
export class AvatarModule {}
