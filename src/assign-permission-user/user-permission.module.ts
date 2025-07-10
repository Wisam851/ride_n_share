// src/user-permission/user-permission.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserPermission } from './entity/user-permission.entity';
import { User } from 'src/users/entity/user.entity';
import { Permission } from 'src/permissions/entity/permission.entity';
import { UserPermissionsController } from './user-permissions.controller';
import { UserPermissionsService } from './user-permissions.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserPermission, User, Permission])],
  controllers: [UserPermissionsController],
  providers: [UserPermissionsService],
  exports: [UserPermissionsService],
})
export class UserPermissionModule {}
