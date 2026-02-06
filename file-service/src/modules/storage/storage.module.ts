import { Module, forwardRef } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { StorageService } from "./services/storage/storage.service";
import { StorageItem, StorageItemSchema } from "./schemas/storage.item.schema";
import { UserStorage, UserStorageSchema } from "./schemas/storage.schema";
import { PermissionClientModule } from "../permission-client/permission-client.module";
import { TokenClientModule } from "../token-client/token-client.module";
import { StorageController } from "./storage.controller";
import { StorageItemRepository } from "./services/storage-item/storage-item.repository";
import { StorageItemQueryService } from "./services/storage-item/storage-item.query.service";
import { StorageItemTreeService } from "./services/storage-item/storage-item.tree.service";
import { StorageItemTrashService } from "./services/storage-item/storage-item.trash.service";
import { StorageItemCopyService } from "./services/storage-item/storage-item.copy.service";
import { StorageItemCommandService } from "./services/storage-item/storage-item.command.service";
import { FileModule } from "../file/file.module";
import {
  STORAGE_SERVICE_TOKEN,
  STORAGE_ITEM_SERVICE_TOKEN,
} from "./interfaces/storage-service.tokens";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "UserStorage", schema: UserStorageSchema },
      { name: "StorageItem", schema: StorageItemSchema },
    ]),
    PermissionClientModule,
    TokenClientModule,
    forwardRef(() => FileModule),
  ],
  controllers: [StorageController],
  providers: [
    {
      provide: STORAGE_SERVICE_TOKEN,
      useClass: StorageService,
    },
    StorageService,
    StorageItemRepository,
    StorageItemQueryService,
    StorageItemTreeService,
    StorageItemTrashService,
    StorageItemCopyService,
    StorageItemCommandService,
  ],
  exports: [STORAGE_SERVICE_TOKEN, StorageService],
})
export class StorageModule {}
