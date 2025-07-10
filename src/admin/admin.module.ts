import { Module } from '@nestjs/common';
import { AdminsService } from './admin.service';
import { AdminsController } from './admin.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from './entity/admin.entity';
import { Role } from 'src/roles/entity/roles.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Admin, Role])],
  providers: [AdminsService],
  controllers: [AdminsController],
})
export class AdminsModule {}
