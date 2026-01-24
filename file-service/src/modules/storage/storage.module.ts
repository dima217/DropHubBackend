import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StorageService } from './storage.service';
import { StorageItemService } from './storage.item.service';
import { StorageItem, StorageItemSchema } from './schemas/storage.item.schema';
import { UserStorage, UserStorageSchema } from './schemas/storage.schema';
import { PermissionClientModule } from '../permission-client/permission-client.module';
import { TokenClientModule } from '../token-client/token-client.module';
import { StorageController } from './storage.controller';
import {
  STORAGE_SERVICE_TOKEN,
  STORAGE_ITEM_SERVICE_TOKEN,
} from './interfaces/storage-service.tokens';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'UserStorage', schema: UserStorageSchema },
      { name: 'StorageItem', schema: StorageItemSchema },
    ]),
    PermissionClientModule,
    TokenClientModule,
  ],
  controllers: [StorageController],
  providers: [
    {
      provide: STORAGE_SERVICE_TOKEN,
      useClass: StorageService,
    },
    {
      provide: STORAGE_ITEM_SERVICE_TOKEN,
      useClass: StorageItemService,
    },
    StorageService,
    StorageItemService,
  ],
  exports: [STORAGE_SERVICE_TOKEN, STORAGE_ITEM_SERVICE_TOKEN, StorageService],
})
export class StorageModule {}

