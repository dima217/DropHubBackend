import { Module, forwardRef } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { RoomService } from "./room.service";
import { Room, RoomSchema } from "./schemas/room.schema";
import { PermissionClientModule } from "../permission-client/permission-client.module";
import { RoomController } from "./room.controller";
import { ROOM_SERVICE_TOKEN } from "./interfaces";
import { FileModule } from "../file/file.module";
import { FileSchema } from "../file/schemas/file.schema";
import { ArchiveRoomService } from "./services/archive-room.service";
import { StorageModule } from "../storage/storage.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Room.name, schema: RoomSchema },
      { name: File.name, schema: FileSchema },
    ]),
    forwardRef(() => FileModule),
    forwardRef(() => StorageModule),
    PermissionClientModule,
  ],
  controllers: [RoomController],
  providers: [
    {
      provide: ROOM_SERVICE_TOKEN,
      useClass: RoomService,
    },
    RoomService,
    ArchiveRoomService,
  ],
  exports: [ROOM_SERVICE_TOKEN, RoomService, ArchiveRoomService],
})
export class RoomModule {}
