import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolePermissions } from './entity/role-permission.entity';
import { RolePermissionsController } from './role-permissions.controller';
import { RolePermissionsService } from './role-permissions.service';
import { Role } from 'src/roles/entity/roles.entity';
import { Permission } from 'src/permissions/entity/permission.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RolePermissions, Role, Permission])],
  controllers: [RolePermissionsController],
  providers: [RolePermissionsService],
  exports: [RolePermissionsService],
})
export class RolePermissionModule {}
