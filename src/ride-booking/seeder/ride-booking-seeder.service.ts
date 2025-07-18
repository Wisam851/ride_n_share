// src/ride-bookings/seed/ride-booking-seeder.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RideBooking } from '../entity/ride-booking.entity';
import { Repository } from 'typeorm';
import { User } from 'src/users/entity/user.entity';
import { RideFareStandard } from 'src/ride-fare-standards/entity/ride-fare-standards.entity';
import { RideStatus, RideType } from 'src/common/enums/ride-booking.enum';

@Injectable()
export class RideBookingSeederService {
  private readonly logger = new Logger(RideBookingSeederService.name);

  constructor(
    @InjectRepository(RideBooking)
    private readonly rideRepo: Repository<RideBooking>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(RideFareStandard)
    private readonly fareRepo: Repository<RideFareStandard>,
  ) {}

  async seed() {
    const customer = await this.userRepo.findOne({ where: { id: 1 } });
    const driver = await this.userRepo.findOne({ where: { id: 2 } });
    const fare = await this.fareRepo.findOne({ where: { status: 1 } });
    const rideBooking = await this.rideRepo.find();
    if (rideBooking.length > 0) {
      this.logger.error(
        'Ride Booking is already have First Entry',
      );
      return;
    }
    if (!customer || !driver || !fare) {
      this.logger.error(
        'Customer, driver or fare data missing. Please seed users and fare first.',
      );
      return;
    }

    const dummy = this.rideRepo.create({
      ride_type: RideType.PRIVATE,
      customer_id: 1,
      customer,
      driver_id: 2,
      driver,
      fare_standard: fare,
      fare_standard_id: fare.id,
      base_fare: 500,
      total_fare: 500,
      discount: 50,
      additional_cost: 20,
      additional_cost_reason: 'Night Ride',
      surcharge_amount: 30,
      company_fees_amount: 40,
      app_fees_amount: 15,
      traffic_delay_amount: 10,
      driver_fees_amount: 350,
      ride_timing: 30,
      ride_delay_time: 5,
      ride_km: 10.5,
      ride_start_time: new Date(),
      ride_end_time: new Date(),
      ride_status: RideStatus.REQUESTED,
      cancel_reason: undefined,
      created_by: 1, // ✅ FIXED here
      status: 1,
    });

    await this.rideRepo.save(dummy);
    this.logger.log('✅ Dummy ride booking seeded successfully!');
  }
}
