import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entity/user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserDetails } from './entity/user_details.entity';
import { UserRole } from 'src/assig-roles-user/entity/user-role.entity';
import { Role } from 'src/roles/entity/roles.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserDetails, Role, UserRole])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
