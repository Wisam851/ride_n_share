import { Module } from '@nestjs/common';
import { ComplaintsCategoryController } from './complaints-category.controller';
import { ComplaintsCategoryService } from './complaints-category.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { complaintsCaterory } from './entity/complaints_category.entity';
import { Admin } from 'src/admin/entity/admin.entity';

@Module({
  imports : [ TypeOrmModule.forFeature([ complaintsCaterory,Admin])],
  controllers: [ComplaintsCategoryController],
  providers: [ComplaintsCategoryService]
})
export class ComplaintsCategoryModule {}
