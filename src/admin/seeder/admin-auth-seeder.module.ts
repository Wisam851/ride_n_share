import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminAuthSeederService } from './admin-auth-seeder.service';
import { Admin } from '../entity/admin.entity';
import { Role } from 'src/roles/entity/roles.entity';
import { AdminRole } from 'src/assig-roles-admin/entity/admin-role.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Admin, Role, AdminRole])],
  providers: [AdminAuthSeederService],
  exports: [AdminAuthSeederService], // Export to use in AppModule
})
export class AdminAuthSeederModule {}
