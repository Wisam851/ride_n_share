import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from 'src/roles/entity/roles.entity';
import { UserRolesController } from './user-roles.controller';
import { User } from 'src/users/entity/user.entity';
import { UserRolesService } from './user-roles.service';
import { UserRole } from './entity/user-role.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserRole, User, Role])],
  controllers: [UserRolesController],
  providers: [UserRolesService],
  exports: [UserRolesService],
})
export class UserRoleModule {}
