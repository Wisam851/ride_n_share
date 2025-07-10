import { Module } from '@nestjs/common';
import { RideBookingController } from './ride-booking.controller';
import { RideBookingService } from './ride-booking.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RideBooking } from './entity/ride-booking.entity';
import { User } from 'src/users/entity/user.entity';
import { RideFareStandard } from 'src/ride-fare-standards/entity/ride-fare-standards.entity';
import { RideRouting } from './entity/ride-routing.entity';
import { RideBookingLog } from './entity/ride-booking-logs.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RideBooking,
      User,
      RideFareStandard,
      RideRouting,
      RideBookingLog,
    ]),
  ],
  controllers: [RideBookingController],
  providers: [RideBookingService],
  exports: [RideBookingService],
})
export class RideBookingModule {}
