import { Module } from '@nestjs/common';
import { ComplaintsController } from './complaints.controller';
import { ComplaintsService } from './complaints.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { complaints } from './entity/complaints.entity';
import { User } from 'src/users/entity/user.entity';
import { RideBookingModule } from 'src/ride-booking/ride-booking.module';

@Module({
  imports: [TypeOrmModule.forFeature([complaints, User]), RideBookingModule],
  controllers: [ComplaintsController],
  providers: [ComplaintsService],
})
export class ComplaintsModule {}
