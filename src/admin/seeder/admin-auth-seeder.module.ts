import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from 'src/admin-auth/entity/admin.entity';
import { AdminAuthSeederService } from './admin-auth-seeder.service';

@Module({
  imports: [TypeOrmModule.forFeature([Admin])],
  providers: [AdminAuthSeederService],
  exports: [AdminAuthSeederService], // Export to use in AppModule
})
export class AdminAuthSeederModule {}
