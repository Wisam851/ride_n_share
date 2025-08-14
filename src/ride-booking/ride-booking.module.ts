import { Module } from '@nestjs/common';
import { RideBookingController } from './ride-booking.controller';
import { RideBookingService } from './ride-booking.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RideBooking } from './entity/ride-booking.entity';
import { User } from 'src/users/entity/user.entity';
import { RideFareStandard } from 'src/ride-fare-standards/entity/ride-fare-standards.entity';
import { RideRouting } from './entity/ride-routing.entity';
import { RideBookingLog } from './entity/ride-booking-logs.entity';
import { RideRequest } from './entity/requests/ride_requests.entity';
import { RideRequestRouting } from './entity/requests/ride_request_routing.entity';
import { RideRequestEvent } from './entity/requests/ride_request_events.entity';
import { RideDriverOffer } from './entity/requests/ride_driver_offers.entity';
import { RideBookingAdminController } from './ride-booking-admin.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RideBooking,
      User,
      RideFareStandard,
      RideRouting,
      RideBookingLog,
      RideRequest,
      RideRequestRouting,
      RideRequestEvent,
      RideDriverOffer,
    ]),
  ],
  controllers: [RideBookingController, RideBookingAdminController],
  providers: [RideBookingService],
  exports: [RideBookingService],
})
export class RideBookingModule {}
