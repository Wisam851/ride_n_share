import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RideBooking } from './entity/ride-booking.entity';
import { Repository, DataSource, EntityManager } from 'typeorm';
import {
  AcceptRideDto,
  CalculateFareDto,
  CancelRideDto,
  RideBookingDto,
  UpdateRideBookingDto,
} from './dtos/create-ride-booking.dto';
import { User } from 'src/users/entity/user.entity';
import { RideFareStandard } from 'src/ride-fare-standards/entity/ride-fare-standards.entity';
import { RideBookingLog } from './entity/ride-booking-logs.entity';
import { RideRouting } from './entity/ride-routing.entity';
import {
  RideBookingNotes,
  RideLocationType,
  RideStatus,
} from 'src/common/enums/ride-booking.enum';

@Injectable()
export class RideBookingService {
  constructor(
    @InjectRepository(RideBooking)
    private readonly rideBookRepo: Repository<RideBooking>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(RideFareStandard)
    private readonly fareRepo: Repository<RideFareStandard>,

    @InjectRepository(RideBookingLog)
    private readonly rideBookLogRepo: Repository<RideBookingLog>,

    @InjectRepository(RideRouting)
    private readonly rideRoutingRepo: Repository<RideRouting>,

    private readonly dataSource: DataSource,
  ) {}
  private logger = new Logger('DriverGateway');

  async calculateFare(dto: CalculateFareDto) {
    const { ride_km, ride_timing } = dto;

    const fareStandard = await this.fareRepo.findOne({
      where: { status: 1 },
    });

    if (!fareStandard) {
      return {
        success: false,
        message: 'No active fare standard found',
      };
    }
    const fare_id = fareStandard.id;
    const baseFare = Number(fareStandard.price_per_km) * ride_km;
    const surcharge_amount = (fareStandard.sur_charge / 100) * baseFare;

    const app_fees_amount = Number(fareStandard.app_fees);
    const company_fees_amount = (fareStandard.company_fees / 100) * baseFare;
    const driver_fees_amount = (fareStandard.driver_fees / 100) * baseFare;
    const additional_cost = Number(fareStandard.additional_cost || 0);
    const discount = Number(fareStandard.discount || 0);

    const fare_amount =
      baseFare +
      surcharge_amount +
      app_fees_amount +
      company_fees_amount +
      additional_cost -
      discount;

    return {
      success: true,
      message: 'Fare calculated successfully',
      data: {
        fare_id,
        ride_km,
        ride_timing,
        base_fare: baseFare,
        surcharge_amount,
        app_fees_amount,
        company_fees_amount,
        driver_fees_amount,
        additional_cost,
        discount,
        total_fare: fare_amount,
      },
    };
  }

  async create(dto: RideBookingDto, customer_id: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const fare_standard = await queryRunner.manager.findOne(
        RideFareStandard,
        {
          where: { status: 1 },
        },
      );

      if (!fare_standard)
        throw new BadRequestException('No active fare standard found');
      if (fare_standard.id !== dto.fare_id)
        throw new BadRequestException('Fare standard mismatch');

      // Double-check fare consistency
      const expected = await this.calculateFare({
        ride_km: dto.ride_km,
        ride_timing: dto.ride_timing,
      });

      const expectedFare = expected.data;

      if (!expectedFare) {
        throw new BadRequestException('Failed to calculate expected fare');
      }

      if (
        Math.round(expectedFare.total_fare ?? 0) !==
        Math.round(dto.total_fare ?? 0)
      ) {
        throw new BadRequestException('Fare calculation mismatch');
      }
      const otp_code = Math.floor(10000 + Math.random() * 90000);
      const ride = this.rideBookRepo.create({
        ride_type: dto.type,
        customer_id,
        driver_id: dto.driver_id,
        fare_standard_id: dto.fare_id,
        fare_standard,
        base_fare: dto.base_fare,
        total_fare: dto.total_fare,
        discount: dto.discount,
        otp_code: otp_code.toString(),
        additional_cost: dto.additional_costs,
        additional_cost_reason: fare_standard.additional_cost_reason,
        surcharge_amount: dto.surcharge_amount,
        company_fees_amount: dto.company_fees_amount,
        app_fees_amount: dto.app_fees_amount,
        traffic_delay_amount: dto.traffic_delay_amount,
        driver_fees_amount: dto.driver_fees_amount,
        ride_timing: dto.ride_timing,
        ride_delay_time: dto.ride_delay_time,
        ride_km: dto.ride_km,
        created_by: customer_id,
      });

      const savedRide = await queryRunner.manager.save(RideBooking, ride);

      await this.createRideLog(
        queryRunner.manager,
        savedRide,
        RideStatus.BOOKED,
        RideBookingNotes.BOOKED,
        customer_id,
      );

      const routingEntities = dto.routing.map((route) =>
        this.rideRoutingRepo.create({
          ride: savedRide,
          type: route.type,
          latitude: route.latitude,
          longitude: route.longitude,
          created_by: customer_id,
        }),
      );
      await queryRunner.manager.save(RideRouting, routingEntities);

      await queryRunner.commitTransaction();

      return {
        success: true,
        message: 'Ride booking created successfully',
        data: savedRide,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.handleUnknown(err);
    } finally {
      await queryRunner.release();
    }
  }

  // ride-booking.service.ts
  async acceptRide(rideId: number, driverId: number, dto: AcceptRideDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const ride = await queryRunner.manager.findOne(RideBooking, {
        where: { id: rideId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!ride) {
        throw new NotFoundException('Ride not found');
      }

      if (ride.ride_status !== RideStatus.BOOKED) {
        throw new BadRequestException('Ride is not available for acceptance');
      }

      if (ride.driver_id) {
        throw new BadRequestException('Ride already accepted');
      }
      const driver = await this.userRepo.findOne({ where: { id: driverId } });
      if (!driver) throw new NotFoundException('Driver Not Found');
      // Update ride
      ride.driver_id = driverId;
      ride.driver = driver;
      ride.ride_status = RideStatus.ACCEPTED;
      await queryRunner.manager.save(RideBooking, ride);

      // Save driver's current location
      const driverLocation = this.rideRoutingRepo.create({
        ride: ride,
        type: RideLocationType.DRIVER_LOCATION,
        latitude: dto.latitude,
        longitude: dto.longitude,
        address: dto.address,
        created_by: driverId,
      });

      await queryRunner.manager.save(RideRouting, driverLocation);

      // Log ride status change
      await this.createRideLog(
        queryRunner.manager,
        ride,
        RideStatus.ACCEPTED,
        RideBookingNotes.ACCEPTED,
        driverId,
      );

      await queryRunner.commitTransaction();

      return {
        success: true,
        message: 'Ride accepted successfully',
        data: ride,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.handleUnknown(err);
    } finally {
      await queryRunner.release();
    }
  }

  async arrivedRide(rideId: number, driverid: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const ride = await this.rideBookRepo.findOne({
        where: { id: rideId },
      });
      if (!ride) throw new NotFoundException('Ride not found');

      if (ride.ride_status !== RideStatus.ACCEPTED)
        throw new BadRequestException('Ride is not accepted yet');
      console.log(driverid);
      if (Number(ride.driver_id) != Number(driverid)) {
        throw new BadRequestException('You did not have this ride assigned');
      }

      ride.ride_status = RideStatus.ARRIVED;
      await queryRunner.manager.save(RideBooking, ride);

      // Log ride status change
      await this.createRideLog(
        queryRunner.manager,
        ride,
        RideStatus.ARRIVED,
        RideBookingNotes.ARRIVED,
        driverid,
      );

      await queryRunner.commitTransaction();

      return {
        success: true,
        message: 'The Driver is Arrived',
        data: ride,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.handleUnknown(err);
    } finally {
      await queryRunner.release();
    }
  }
  // ride-booking.service.ts
  async verifyAndStartRide(rideId: number, driverId: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const ride = await this.rideBookRepo.findOne({ where: { id: rideId } });
      if (!ride) throw new NotFoundException('Ride not found');

      this.logger.debug(`Ride Status in DB: ${ride.ride_status}`);

      if (ride.ride_status !== RideStatus.ARRIVED)
        throw new BadRequestException('Ride is not in ARRIVED state');

      if (ride.driver_id !== driverId)
        throw new BadRequestException('Not assigned to this ride');

      ride.ride_status = RideStatus.IN_PROGRESS;
      ride.ride_start_time = new Date();
      await queryRunner.manager.save(ride);

      await this.createRideLog(
        queryRunner.manager,
        ride,
        RideStatus.IN_PROGRESS,
        RideBookingNotes.STARTED,
        driverId,
      );

      await queryRunner.commitTransaction();
      return {
        success: true,
        message: 'Ride started',
        data: ride,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.handleUnknown(err);
    } finally {
      await queryRunner.release();
    }
  }

  async completeRide(rideId: number, driverId: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const ride = await this.rideBookRepo.findOne({
        where: { id: rideId },
        relations: ['fare_standard'],
      });

      if (!ride) throw new NotFoundException('Ride not found');

      if (ride.ride_status !== RideStatus.IN_PROGRESS)
        throw new BadRequestException('Ride has not been started yet');

      if (ride.driver_id !== driverId)
        throw new BadRequestException('Unauthorized ride completion');
      if (!ride.ride_start_time) throw new Error('Start time missing!');

      const now = new Date();
      const start = new Date(ride.ride_start_time);

      // Calculate actual ride duration
      const actualRideMinutes = Math.ceil(
        (now.getTime() - start.getTime()) / 60000,
      );

      // Get allowed/estimated ride time
      const allowedMinutes = ride.ride_timing ?? 0;

      // Calculate delay
      const delayMinutes = Math.max(0, actualRideMinutes - allowedMinutes);

      // Get fare standard info
      const fareStandard = ride.fare_standard;

      // Initialize traffic delay amount
      let trafficDelayAmount = 0;

      // Calculate delay charge if applicable
      if (delayMinutes > (fareStandard?.traffic_delay_time ?? 0)) {
        const baseFare = Number(ride.base_fare ?? 0);
        const delayRate = Number(fareStandard.traffic_delay_charge ?? 0);

        trafficDelayAmount = (delayRate / 100) * baseFare;
      }

      // Final ride updates
      ride.ride_status = RideStatus.COMPLETED;
      ride.ride_end_time = now;
      ride.ride_delay_time = delayMinutes;
      ride.traffic_delay_amount = trafficDelayAmount;

      // Summary
      console.log('✅ [Ride Completed] Final Ride Object to Save:', {
        status: ride.ride_status,
        end_time: ride.ride_end_time,
        delay_time: ride.ride_delay_time,
        traffic_delay_amount: ride.traffic_delay_amount,
      });
      let total_fare = ride.total_fare;
      if (trafficDelayAmount > 0) {
        total_fare = Number(ride.total_fare ?? 0) + trafficDelayAmount;
        ride.total_fare = total_fare;
        console.log(`End Total fare ${total_fare}`);
      }

      await queryRunner.manager.save(ride);

      await this.createRideLog(
        queryRunner.manager,
        ride,
        RideStatus.COMPLETED,
        RideBookingNotes.COMPLETED,
        driverId,
      );

      await queryRunner.commitTransaction();
      return {
        success: true,
        message: 'Ride completed successfully with updated fare',
        data: {
          ride_id: ride.id,
          total_fare: total_fare,
          delay_minutes: delayMinutes,
          traffic_delay_charge: trafficDelayAmount,
          ride_end_time: ride.ride_end_time,
        },
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.handleUnknown(err);
    } finally {
      await queryRunner.release();
    }
  }

  // ride-booking.service.ts
  async cancelRide(
    rideId: number,
    userId: number,
    dto: CancelRideDto,
    role: 'customer' | 'driver',
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const ride = await queryRunner.manager.findOne(RideBooking, {
        where: { id: rideId },
        relations: ['customer', 'driver'],
      });

      if (!ride) throw new NotFoundException('Ride not found');

      if (role === 'driver' && Number(ride.driver_id) !== Number(userId)) {
        throw new BadRequestException('You are not the assigned driver');
      }

      if (role === 'customer' && Number(ride.customer_id) !== Number(userId)) {
        throw new BadRequestException('You are not the customer of this ride');
      }

      if (
        [
          RideStatus.CANCELLED_BY_CUSTOMER,
          RideStatus.CANCELLED_BY_DRIVER,
          RideStatus.COMPLETED,
        ].includes(ride.ride_status)
      ) {
        throw new BadRequestException('Cannot cancel this ride');
      }

      // Set cancellation status
      const status =
        role === 'driver'
          ? RideStatus.CANCELLED_BY_DRIVER
          : RideStatus.CANCELLED_BY_CUSTOMER;

      ride.ride_status = status;
      ride.cancel_reason = dto.reason;

      await queryRunner.manager.save(ride);

      await this.createRideLog(
        queryRunner.manager,
        ride,
        status,
        `Cancelled: ${dto.reason}`,
        userId,
      );

      await queryRunner.commitTransaction();

      return {
        success: true,
        message: `Ride cancelled by ${role}`,
        data: ride,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.handleUnknown(err);
    } finally {
      await queryRunner.release();
    }
  }

  async createRideLog(
    manager: EntityManager,
    ride: RideBooking,
    status: RideStatus,
    note: string,
    changedByUserId: number,
  ) {
    const log = this.rideBookLogRepo.create({
      ride_id: ride.id,
      ride: ride,
      status: status, // enum value here
      note: note,
      changed_by: { id: changedByUserId }, // or user entity if you fetched it
      changed_at: new Date(),
    });

    await manager.save(log);
  }

  async findAll() {
    try {
      const list = await this.rideBookRepo.find({
        order: { created_at: 'DESC' },
      });
      return {
        success: true,
        message: 'All ride bookings fetched',
        data: list,
      };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  async findOne(id: number) {
    try {
      const ride = await this.rideBookRepo.findOne({ where: { id } });
      if (!ride) throw new NotFoundException('Ride booking not found');
      return {
        success: true,
        message: 'Ride booking found',
        data: ride,
      };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  async update(id: number, dto: UpdateRideBookingDto) {
    try {
      const ride = await this.rideBookRepo.findOne({ where: { id } });
      if (!ride) throw new NotFoundException('Ride booking not found');

      Object.assign(ride, dto);
      ride.updated_at = new Date().toISOString().split('T')[0];
      const updated = await this.rideBookRepo.save(ride);
      return {
        success: true,
        message: 'Ride booking updated successfully',
        data: updated,
      };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  async getRidesByUser(userId: number) {
    try {
      const rides = await this.rideBookRepo.find({
        where: [{ customer_id: userId }, { driver_id: userId }],
        order: { created_at: 'DESC' },
      });
      return {
        success: true,
        message: 'My rides retrieved successfully',
        data: rides,
      };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  private handleUnknown(err: unknown): never {
    if (
      err instanceof BadRequestException ||
      err instanceof NotFoundException
    ) {
      throw err;
    }
    console.error(err);
    throw new InternalServerErrorException('Unexpected error', {
      cause: err as Error,
    });
  }
}
