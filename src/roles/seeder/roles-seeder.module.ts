import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from '../entity/roles.entity';
import { RolesSeederService } from './roles-seeder.service';

@Module({
  imports: [TypeOrmModule.forFeature([Role])],
  providers: [RolesSeederService],
  exports: [RolesSeederService],
})
export class RolesSeederModule {}
