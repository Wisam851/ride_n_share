// src/admin-permission/admin-permission.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminPermission } from './entity/admin-permission.entity';
import { AdminPermissionsController } from './admin-permissions.controller';
import { AdminPermissionsService } from './admin-permissions.service';
import { Admin } from 'src/admin/entity/admin.entity';
import { Permission } from 'src/permissions/entity/permission.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AdminPermission, Admin, Permission])],
  controllers: [AdminPermissionsController],
  providers: [AdminPermissionsService],
  exports: [AdminPermissionsService],
})
export class AdminPermissionModule {}
