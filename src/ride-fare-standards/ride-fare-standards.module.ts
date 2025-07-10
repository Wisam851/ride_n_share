import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RideFareStandard } from './entity/ride-fare-standards.entity';
import { RideFareStandardsController } from './ride-fare-standards.controller';
import { RideFareStandardsService } from './ride-fare-standards.service';
import { Admin } from 'src/admin/entity/admin.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RideFareStandard, Admin])],
  controllers: [RideFareStandardsController],
  providers: [RideFareStandardsService],
  exports: [RideFareStandardsService],
})
export class RideFareStandardsModule {}
