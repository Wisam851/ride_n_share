import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminRole } from './entity/admin-role.entity';
import { Admin } from 'src/admin/entity/admin.entity';
import { Role } from 'src/roles/entity/roles.entity';
import { AdminRolesController } from './admin-roles.controller';
import { AdminRolesService } from './admin-roles.service';

@Module({
  imports: [TypeOrmModule.forFeature([AdminRole, Admin, Role])],
  controllers: [AdminRolesController],
  providers: [AdminRolesService],
  exports: [AdminRolesService],
})
export class AdminRoleModule {}
