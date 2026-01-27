import { forwardRef, Module } from '@nestjs/common';
import { UsersService } from './services/user.service';
import { UserController } from './controllers/user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Profile } from './entities/profile.entity';
import { ProfileService } from './services/profile.service';
import { AuthModule } from 'src/auth/auth.module';
import { FileClientModule } from '../file-client/file-client.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Profile]),
    forwardRef(() => AuthModule),
    FileClientModule,
  ],
  controllers: [UserController],
  providers: [UsersService, ProfileService],
  exports: [UsersService, ProfileService],
})
export class UserModule {}
