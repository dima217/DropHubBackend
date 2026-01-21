import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StorageService } from './storage.service';
import { StorageItemService } from './storage.item.service';
import { StorageItem, StorageItemSchema } from './schemas/storage.item.schema';
import { UserStorage, UserStorageSchema } from './schemas/storage.schema';
import { PermissionClientModule } from '../permission-client/permission-client.module';
import { TokenClientModule } from '../token-client/token-client.module';
import { StorageController } from './storage.controller';

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
  providers: [StorageService, StorageItemService],
  exports: [StorageService],
})
export class StorageModule {}

