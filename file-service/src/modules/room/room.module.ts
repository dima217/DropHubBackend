import { Module, forwardRef } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { RoomService } from "./room.service";
import { Room, RoomSchema } from "./schemas/room.schema";
import { PermissionClientModule } from "../permission-client/permission-client.module";
import { RoomController } from "./room.controller";
import { ROOM_SERVICE_TOKEN } from "./interfaces";
import { FileModule } from "../file/file.module";
import { FileSchema } from "../file/schemas/file.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Room.name, schema: RoomSchema },
      { name: File.name, schema: FileSchema },
    ]),
    forwardRef(() => FileModule),
    PermissionClientModule,
  ],
  controllers: [RoomController],
  providers: [
    {
      provide: ROOM_SERVICE_TOKEN,
      useClass: RoomService,
    },
    RoomService,
  ],
  exports: [ROOM_SERVICE_TOKEN, RoomService],
})
export class RoomModule {}
