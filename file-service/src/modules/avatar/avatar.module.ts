import { Module } from "@nestjs/common";
import { S3Module } from "../s3/s3.module";
import { AvatarService } from "./avatar.service";
import { AvatarController } from "./avatar.controller";

@Module({
  imports: [S3Module],
  controllers: [AvatarController],
  providers: [AvatarService],
  exports: [AvatarService],
})
export class AvatarModule {}
