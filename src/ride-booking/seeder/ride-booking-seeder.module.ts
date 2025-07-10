// src/ride-bookings/seed/ride-booking-seeder.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RideBookingSeederService } from './ride-booking-seeder.service';
import { RideFareStandard } from 'src/ride-fare-standards/entity/ride-fare-standards.entity';
import { User } from 'src/users/entity/user.entity';
import { RideBooking } from '../entity/ride-booking.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RideBooking, User, RideFareStandard])],
  providers: [RideBookingSeederService],
  exports: [RideBookingSeederService]
})
export class RideBookingSeederModule {}
