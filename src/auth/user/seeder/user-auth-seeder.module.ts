import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entity/user.entity';
import { Role } from 'src/roles/entity/roles.entity';
import { UserRole } from 'src/assig-roles-user/entity/user-role.entity';
import { UserAuthSeederService } from './user-auth-seeder.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role, UserRole])],
  providers: [UserAuthSeederService],
  exports: [UserAuthSeederService],
})
export class UserAuthSeederModule {}
