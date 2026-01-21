import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UniversalPermissionService } from './services/permission.service';
import { Permission } from './entities/permission.entity';
import { UserModule } from '@application/user/user.module';
import { PermissionController } from './controllers/permission.controller';
import { CacheModule } from 'src/cache/cache.module';

@Module({
  imports: [TypeOrmModule.forFeature([Permission]), UserModule, CacheModule],
  controllers: [PermissionController],
  providers: [UniversalPermissionService],
  exports: [UniversalPermissionService],
})
export class PermissionModule {}
