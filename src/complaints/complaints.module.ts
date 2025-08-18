import { Module } from '@nestjs/common';
import { ComplaintsController } from './complaints.controller';
import { ComplaintsService } from './complaints.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { complaints } from './entity/complaints.entity';
import { User } from 'src/users/entity/user.entity';
import { RideBookingModule } from 'src/ride-booking/ride-booking.module';
import { RideBookingLog } from 'src/ride-booking/entity/ride-booking-logs.entity';
import { RideRouting } from 'src/ride-booking/entity/ride-routing.entity';
import { complaintsCaterory } from 'src/complaints-category/entity/complaints_category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([complaints, User, RideBookingLog, complaintsCaterory,  RideRouting]), RideBookingModule],
  controllers: [ComplaintsController],
  providers: [ComplaintsService],
})
export class ComplaintsModule { }
