import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminAuthSeederService } from './admin-auth-seeder.service';
import { Admin } from '../entity/admin.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Admin])],
  providers: [AdminAuthSeederService],
  exports: [AdminAuthSeederService], // Export to use in AppModule
})
export class AdminAuthSeederModule {}
