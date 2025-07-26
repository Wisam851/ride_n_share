import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FareStandard } from '../ride-fare-standards/entity/ride-fare-standards.entity';
import { User } from 'src/users/entity/user.entity';
import { Rating } from '../Rating/entity/rating.entity';
import { CalculateFareDto } from './dtos/ride-booking.dto';

@Injectable()
export class RideBookingService {
  constructor(
    @InjectRepository(FareStandard)
    private fareRepo: Repository<FareStandard>,

    @InjectRepository(User)
    private userRepo: Repository<User>,

    @InjectRepository(Rating)
    private ratingRepo: Repository<Rating>,
  ) {}

  async calculateFare(dto: CalculateFareDto) {
    const { ride_km, ride_timing, customer_id, routing, description } = dto;

    const fareStandard = await this.fareRepo.findOne({
      where: { status: 1 },
    });

    if (!fareStandard) {
      return {
        success: false,
        message: 'No active fare standard found',
      };
    }

    const customer = await this.userRepo.findOne({
      where: { id: customer_id },
    });

    if (!customer) {
      return {
        success: false,
        message: 'Customer not found',
      };
    }

    const customer_name = customer.name;
    const customer_rating = await this.calculateCustomerAverageRating(customer_id);

    const baseFare = Number(fareStandard.price_per_km) * ride_km;
    const surcharge_amount = (fareStandard.sur_charge / 100) * baseFare;
    const app_fees_amount = Number(fareStandard.app_fees);
    const company_fees_amount = (fareStandard.company_fees / 100) * baseFare;
    const driver_fees_amount = (fareStandard.driver_fees / 100) * baseFare;
    const additional_cost = Number(fareStandard.additional_cost || 0);
    const discount = Number(fareStandard.discount || 0);

    const total_fare =
      baseFare +
      surcharge_amount +
      app_fees_amount +
      company_fees_amount +
      additional_cost -
      discount;

    const pickup = routing?.find((r) => r.type === 'pickup') || routing[0];
    const dropoff =
      routing?.find((r) => r.type === 'dropoff') ||
      routing[routing.length - 1];

    return {
      success: true,
      message: 'Fare calculated successfully',
      data: {
        fare_id: fareStandard.id,
        ride_km,
        ride_timing,
        base_fare: baseFare,
        surcharge_amount,
        app_fees_amount,
        company_fees_amount,
        driver_fees_amount,
        additional_cost,
        discount,
        total_fare,
        pickup,
        dropoff,
        description: description || null,
        customer_name,
        customer_rating,
      },
    };
  }

  async calculateCustomerAverageRating(customerId: number): Promise<number> {
    const ratings = await this.ratingRepo.find({
      where: { customer_id: customerId },
    });

    if (!ratings.length) return 5.0;

    const total = ratings.reduce((sum, r) => sum + r.score, 0);
    return parseFloat((total / ratings.length).toFixed(1));
  }
}
