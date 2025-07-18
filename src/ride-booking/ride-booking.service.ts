import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RideBooking } from './entity/ride-booking.entity';
import {
  Repository,
  DataSource,
  EntityManager,
  LessThanOrEqual,
} from 'typeorm';
import {
  CalculateFareDto,
  CancelRideDto,
  DriverOfferDto,
  RideBookingDto,
  RideRequestDto,
  UpdateRideBookingDto,
} from './dtos/ride-booking.dto';
import { User } from 'src/users/entity/user.entity';
import { RideFareStandard } from 'src/ride-fare-standards/entity/ride-fare-standards.entity';
import { RideBookingLog } from './entity/ride-booking-logs.entity';
import { RideRouting } from './entity/ride-routing.entity';
import {
  RideBookingNotes,
  RideDriverOfferStatus,
  RideEventActorType,
  RideLocationType,
  RideStatus,
} from 'src/common/enums/ride-booking.enum';
import { RideRequestMem } from 'src/common/interfaces/ride-inteface';
import { RideRequest } from './entity/requests/ride_requests.entity';
import { RideRequestEvent } from './entity/requests/ride_request_events.entity';
import { RideRequestRouting } from './entity/requests/ride_request_routing.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RideDriverOffer } from './entity/requests/ride_driver_offers.entity';
import {
  estimateEtaMinutes,
  haversineKm,
  LatLng,
} from 'src/common/utils/geo.util';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RideBookingService {
  private rideRequests = new Map<number, RideRequestMem>();
  private requestCounter = 1;
  constructor(
    @InjectRepository(RideBooking)
    private readonly rideBookRepo: Repository<RideBooking>,

    @InjectRepository(RideRequest)
    private readonly rideRequestRepo: Repository<RideRequest>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(RideFareStandard)
    private readonly fareRepo: Repository<RideFareStandard>,

    @InjectRepository(RideBookingLog)
    private readonly rideBookLogRepo: Repository<RideBookingLog>,

    @InjectRepository(RideRouting)
    private readonly rideRoutingRepo: Repository<RideRouting>,

    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}
  private logger = new Logger('DriverGateway');
  private readonly OFFER_LIFETIME_MS = 20_000; // 20s; change via config/env

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

  /** 1. Customer sends ride request */
  async requestRide(dto: RideRequestDto, customerId: number) {
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
      const customer = await queryRunner.manager.findOne(User, {
        where: { id: customerId },
        relations: ['userRoles'],
      });

      if (!customer) throw new BadRequestException('No customer found');
      if (!fare_standard)
        throw new BadRequestException('No active fare standard found');

      const expected = await this.calculateFare({
        ride_km: dto.ride_km,
        ride_timing: dto.ride_timing,
      });
      const expectedFare = expected.data;
      if (!expectedFare)
        throw new BadRequestException('Failed to calculate expected fare');

      const rideRequestCreate = await this.dataSource
        .getRepository(RideRequest)
        .create({
          customer_id: customerId,
          fare_standard_id: dto.fare_id,
          ride_type: dto.type,
          ride_km: dto.ride_km,
          ride_timing: dto.ride_timing,
          status: RideStatus.REQUESTED,
          expires_at: new Date(Date.now() + 60 * 1000),
        });
      const rideRequest = await queryRunner.manager.save(
        RideRequest,
        rideRequestCreate,
      );

      const rideRequestRoutingCreate = dto.routing.map((route) =>
        this.dataSource.getRepository(RideRequestRouting).create({
          request_id: rideRequest.id,
          type: route.type,
          longitude: route.longitude,
          latitude: route.latitude,
          address: route.address,
          seq: route.seq,
        }),
      );
      const rideRequestRouting = await queryRunner.manager.save(
        RideRequestRouting,
        rideRequestRoutingCreate,
      );
      const rideRequestEventCreate = await this.dataSource
        .getRepository(RideRequestEvent)
        .create({
          request_id: rideRequest.id,
          rideRequest: rideRequest,
          event_type: 'request_created',
          actor_type: RideEventActorType.CUSTOMER,
          actor_id: customerId,
          actor: customer,
        });
      const rideRequestEvent = await queryRunner.manager.save(
        RideRequestEvent,
        rideRequestEventCreate,
      );
      await queryRunner.commitTransaction();
      return {
        success: true,
        message: 'User request has been sent',
        data: {
          rideRequest: rideRequest,
          customer: customer,
        },
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
  // for the expiration
  @Cron(CronExpression.EVERY_10_SECONDS)
  async handleRideRequestExiration() {
    this.logger.log('Running ride Request expiry check');

    const expiredRides = await this.dataSource.manager
      .getRepository(RideRequest)
      .find({
        where: {
          status: RideStatus.REQUESTED,
          expires_at: LessThanOrEqual(new Date()),
        },
      });
    if (expiredRides.length === 0) {
      this.logger.log('Nothing found in the ride Request');
      return;
    }

    for (const request of expiredRides) {
      request.status = RideStatus.EXPIRED;
      await this.dataSource.getRepository(RideRequest).save(request);
      this.logger.warn(`Ride request ID ${request.id} marked as EXPIRED`);
    }
  }
  /** 2. Driver offers to take the ride */
  async offerRide(requestId: number, driverId: number, dto: DriverOfferDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // --- lock ride request row ---
      const rideRequest = await queryRunner.manager.findOne(RideRequest, {
        where: { id: requestId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!rideRequest)
        throw new BadRequestException('Ride request not found.');

      // --- driver exists? ---
      const driver = await queryRunner.manager.findOne(User, {
        where: { id: driverId },
      });
      if (!driver) throw new BadRequestException('Driver Not Registered.');

      // --- status ok? ---
      if (
        rideRequest.status !== RideStatus.REQUESTED &&
        rideRequest.status !== RideStatus.DRIVER_OFFERED
      ) {
        throw new BadRequestException(
          `Ride request not offerable in current status: ${rideRequest.status}`,
        );
      }

      // --- request not expired ---
      const now = new Date();
      if (rideRequest.expires_at && rideRequest.expires_at <= now) {
        throw new BadRequestException('Ride request already expired.');
      }

      // --- get pickup coords from routing ---
      const pickup = await this.getPickupCoords(queryRunner.manager, requestId);
      // pickup may be null if bad data; we continue but no distance calc
      let distanceKm: number | null = null;
      let etaMin: number | null = null;
      if (pickup) {
        distanceKm = haversineKm(
          { latitude: dto.latitude, longitude: dto.longitude },
          pickup,
        );
        etaMin = estimateEtaMinutes(distanceKm, this.getDriverAvgSpeedKmh());
      }

      // build meta to store on offer
      const meta = {
        driver_lat: dto.latitude,
        driver_lng: dto.longitude,
        pickup_lat: pickup?.latitude ?? null,
        pickup_lng: pickup?.longitude ?? null,
        distance_km: distanceKm,
        eta_min: etaMin,
      };

      // --- upsert offer ---
      const offerRepo = queryRunner.manager.getRepository(RideDriverOffer);
      const expiresAt = new Date(Date.now() + this.OFFER_LIFETIME_MS);

      let offer = await offerRepo.findOne({
        where: { request_id: requestId, driver_id: driverId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!offer) {
        offer = offerRepo.create({
          request_id: requestId,
          rideRequest,
          driver_id: driverId,
          offered_at: now,
          expires_at: expiresAt,
          status: RideDriverOfferStatus.ACTIVE,
          meta_json: meta,
        });
        await offerRepo.save(offer);
      } else {
        if (
          ![
            RideDriverOfferStatus.SELECTED,
            RideDriverOfferStatus.REJECTED,
            RideDriverOfferStatus.WITHDRAWN,
          ].includes(offer.status)
        ) {
          offer.offered_at = now;
          offer.expires_at = expiresAt;
          offer.status = RideDriverOfferStatus.ACTIVE;
          offer.meta_json = meta; // replace old snapshot
          await offerRepo.save(offer);
        }
      }

      // --- update request status if first offer ---
      if (rideRequest.status === RideStatus.REQUESTED) {
        rideRequest.status = RideStatus.DRIVER_OFFERED;
        await queryRunner.manager.save(rideRequest);
      }

      // --- audit event ---
      const eventRepo = queryRunner.manager.getRepository(RideRequestEvent);
      const event = eventRepo.create({
        rideRequest,
        event_type: 'driver_offered',
        actor_type: RideEventActorType.DRIVER,
        actor_id: driverId,
        actor: driver,
        payload_json: {
          driverId,
          requestId,
          driver_location: { lat: dto.latitude, lng: dto.longitude },
          distance_km: distanceKm,
          eta_min: etaMin,
        },
      });
      await eventRepo.save(event);

      await queryRunner.commitTransaction();

      // Post-commit async actions (socket / expiry scheduling)
      // this.scheduleDriverOfferExpiry(offer.id, expiresAt);
      // this.socketGateway.emitDriverOffered({ requestId, driverId, offerId: offer.id });

      return {
        success: true,
        message: 'Driver offer recorded.',
        data: { offer, request: rideRequest },
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.handleUnknown(err);
    } finally {
      await queryRunner.release();
    }
  }

  // for the driver expiration
  @Cron(CronExpression.EVERY_10_SECONDS)
  async handleDriverOfferExpiration() {
    this.logger.log('Driver Offere Chekk running');

    const driverOffer = await this.dataSource.manager
      .getRepository(RideDriverOffer)
      .find({
        where: {
          status: RideDriverOfferStatus.ACTIVE,
          expires_at: LessThanOrEqual(new Date()),
        },
      });
    if (driverOffer.length === 0) {
      this.logger.log('Driver request not found');
      return;
    }
    for (const offeres of driverOffer) {
      ((offeres.status = RideDriverOfferStatus.EXPIRED),
        await this.dataSource.getRepository(RideDriverOffer).save(offeres));
      this.logger.warn('Driver request expired andn not selected');
    }
  }

  /** 3. Customer confirms driver → Create booking */
  async confirmDriver(requestId: number, driverId: number, customerId: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // ---------------------------------------------
      // 1. Lock ride_request row (NO relations!)
      // ---------------------------------------------
      const rideRequest = await queryRunner.manager
        .getRepository(RideRequest)
        .createQueryBuilder('req')
        .where('req.id = :id', { id: requestId })
        .setLock('pessimistic_write')
        .getOne();

      if (!rideRequest) throw new NotFoundException('Ride request not found');
      if (rideRequest.customer_id !== customerId)
        throw new ForbiddenException('Access denied');

      if (
        rideRequest.status !== RideStatus.REQUESTED &&
        rideRequest.status !== RideStatus.DRIVER_OFFERED
      ) {
        throw new BadRequestException('Request cannot be confirmed.');
      }

      if (rideRequest.expires_at && rideRequest.expires_at <= new Date()) {
        throw new BadRequestException('Ride request expired.');
      }

      // ---------------------------------------------
      // 2. Lock all offers for this request
      // ---------------------------------------------
      const offerRepo = queryRunner.manager.getRepository(RideDriverOffer);
      const offers = await offerRepo
        .createQueryBuilder('o')
        .where('o.request_id = :id', { id: requestId })
        .setLock('pessimistic_write')
        .getMany();

      const selectedOffer = offers.find((o) => o.driver_id === driverId);
      if (!selectedOffer) {
        throw new BadRequestException('Driver did not offer for this request.');
      }
      if (selectedOffer.status !== RideDriverOfferStatus.ACTIVE) {
        throw new BadRequestException('Offer is no longer active.');
      }

      // ---------------------------------------------
      // 3. Mark selected & reject others
      // ---------------------------------------------
      selectedOffer.status = RideDriverOfferStatus.SELECTED;
      await offerRepo.save(selectedOffer);

      for (const offer of offers) {
        if (
          offer.id !== selectedOffer.id &&
          offer.status === RideDriverOfferStatus.ACTIVE
        ) {
          offer.status = RideDriverOfferStatus.REJECTED;
          await offerRepo.save(offer);
        }
      }

      // ---------------------------------------------
      // 4. Create booking (snake_case fields!)
      // ---------------------------------------------
      const booking = queryRunner.manager.create(RideBooking, {
        ride_type: rideRequest.ride_type,
        customer_id: rideRequest.customer_id,
        driver_id: driverId,
        fare_standard_id: rideRequest.fare_standard_id,
        ride_km: rideRequest.ride_km,
        ride_timing: rideRequest.ride_timing,
        ride_status: RideStatus.CONFIRMED,
        otp_code: this.generateOtp(6),
        // created_by: rideRequest.customer_id, // uncomment if column required & not relation mismatch
      });
      await queryRunner.manager.save(booking);

      // ---------------------------------------------
      // 5. Copy routing request -> booking routing
      // ---------------------------------------------
      const reqRouting = await queryRunner.manager.find(RideRequestRouting, {
        where: { request_id: requestId },
        order: { seq: 'ASC' },
      });

      const rideRoutingRows = reqRouting.map((r) =>
        queryRunner.manager.create(RideRouting, {
          ride_id: booking.id,
          type: r.type,
          latitude: r.latitude,
          longitude: r.longitude,
          address: r.address,
          created_by: rideRequest.customer_id, // adjust if relation
        }),
      );
      await queryRunner.manager.save(RideRouting, rideRoutingRows);
      // Extract driver coordinates from meta_json
      const driverMeta = selectedOffer.meta_json || {};
      const driverLat = driverMeta.driver_lat || driverMeta.latitude;
      const driverLng = driverMeta.driver_lng || driverMeta.longitude;

      if (!driverLat || !driverLng) {
        throw new BadRequestException('Driver location missing in offer meta.');
      }

      // Insert driver location into ride_routing
      const driverRouting = queryRunner.manager.create(RideRouting, {
        ride_id: booking.id,
        type: RideLocationType.DRIVER_LOCATION, // custom enum for routing type
        latitude: driverLat,
        longitude: driverLng,
        address: driverMeta.address || 'Driver current location',
        created_by: driverId,
      });
      await queryRunner.manager.save(driverRouting);

      // ---------------------------------------------
      // 6. Update ride_request to confirmed
      // ---------------------------------------------
      rideRequest.status = RideStatus.CONFIRMED;
      rideRequest.confirmed_driver_id = driverId;
      rideRequest.confirmed_booking_id = booking.id;
      await queryRunner.manager.save(rideRequest);

      // ---------------------------------------------
      // 7. Insert events (use relation if you want; raw FK is fine)
      // ---------------------------------------------
      const eventRepo = queryRunner.manager.getRepository(RideRequestEvent);
      const confirmEvents = [
        eventRepo.create({
          request_id: rideRequest.id,
          event_type: 'customer_selected_driver',
          actor_type: RideEventActorType.CUSTOMER,
          actor_id: customerId,
          payload_json: { driverId },
        }),
        eventRepo.create({
          request_id: rideRequest.id,
          event_type: 'request_confirmed',
          actor_type: RideEventActorType.SYSTEM,
          payload_json: { bookingId: booking.id },
        }),
      ];
      await eventRepo.save(confirmEvents);

      // ---------------------------------------------
      // 8. Booking log (if you keep RideStatus vs RideBookingNotes)
      // ---------------------------------------------
      await this.createRideLog(
        queryRunner.manager,
        booking,
        RideStatus.CONFIRMED,
        RideBookingNotes.CONFIRMED,
        driverId,
      );

      await queryRunner.commitTransaction();

      return { success: true, bookingId: booking.id };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.handleUnknown(err);
    } finally {
      await queryRunner.release();
    }
  }

  /** Fare calculation placeholder (reuse your existing method) */
  async arrivedRide(rideId: number, driverId: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      console.log('arrived');
      const manager = queryRunner.manager;
      const ride = await this.loadRideForUpdate(manager, rideId);

      if (ride.ride_status !== RideStatus.CONFIRMED) {
        throw new BadRequestException(
          'Ride is not in a confirmable state to mark arrived.',
        );
      }

      if (ride.driver_id !== driverId) {
        throw new BadRequestException('You are not assigned to this ride.');
      }

      ride.ride_status = RideStatus.ARRIVED;
      await manager.save(ride);

      await this.createRideLog(
        manager,
        ride,
        RideStatus.ARRIVED,
        RideBookingNotes.ARRIVED,
        driverId,
      );

      await queryRunner.commitTransaction();

      const updated = await this.rideBookRepo.findOne({
        where: { id: ride.id },
      });
      return {
        success: true,
        message: 'Driver marked as arrived.',
        data: updated,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.handleUnknown(err);
    } finally {
      await queryRunner.release();
    }
  }

  /* async arrivedRide(rideId: number, driverid: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const ride = await this.rideBookRepo.findOne({
        where: { id: rideId },
      });
      if (!ride) throw new NotFoundException('Ride not found');

      if (ride.ride_status !== RideStatus.CUSTOMER_SELECTED)
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
      const updatedRide = await this.rideBookRepo.findOne({
        where: { id: ride.id },
      });
      this.logger.debug(
        'Ride Status from DB is THis:',
        updatedRide?.ride_status,
      );
      return {
        success: true,
        message: 'The Driver is Arrived',
        data: updatedRide,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.handleUnknown(err);
    } finally {
      await queryRunner.release();
    }
  } */

  // ride-booking.service.ts
  async startRide(rideId: number, driverId: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const manager = queryRunner.manager;
      const ride = await this.loadRideForUpdate(manager, rideId);

      if (ride.ride_status !== RideStatus.ARRIVED) {
        throw new BadRequestException('Ride must be ARRIVED before starting.');
      }

      if (ride.driver_id !== driverId) {
        throw new BadRequestException('You are not assigned to this ride.');
      }

      ride.ride_status = RideStatus.IN_PROGRESS;
      ride.ride_start_time = new Date();
      await manager.save(ride);

      await this.createRideLog(
        manager,
        ride,
        RideStatus.IN_PROGRESS,
        RideBookingNotes.STARTED,
        driverId,
      );

      await queryRunner.commitTransaction();

      const updated = await this.rideBookRepo.findOne({
        where: { id: ride.id },
      });
      return {
        success: true,
        message: 'Ride started.',
        data: updated,
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
      const manager = queryRunner.manager;
      const ride = await this.loadRideForUpdate(manager, rideId, [
        'fare_standard',
      ]);

      if (ride.ride_status !== RideStatus.IN_PROGRESS) {
        throw new BadRequestException('Ride is not in progress.');
      }

      if (ride.driver_id !== driverId) {
        throw new BadRequestException('Unauthorized ride completion.');
      }
      if (!ride.ride_start_time) {
        throw new InternalServerErrorException('Start time missing on ride.');
      }

      const now = new Date();
      const start = new Date(ride.ride_start_time);
      const actualMinutes = Math.ceil(
        (now.getTime() - start.getTime()) / 60000,
      );
      const allowedMinutes = ride.ride_timing ?? 0;
      const delayMinutes = Math.max(0, actualMinutes - allowedMinutes);

      const fareStandard = ride.fare_standard;
      let trafficDelayAmount = 0;

      if (
        delayMinutes > (fareStandard?.traffic_delay_time ?? 0) &&
        fareStandard?.traffic_delay_charge
      ) {
        const baseFare = Number(ride.base_fare ?? 0);
        trafficDelayAmount =
          (Number(fareStandard.traffic_delay_charge) / 100) * baseFare;
      }

      if (trafficDelayAmount > 0) {
        ride.total_fare = Number(ride.total_fare ?? 0) + trafficDelayAmount;
        ride.traffic_delay_amount = trafficDelayAmount;
        ride.ride_delay_time = delayMinutes;
      } else {
        ride.ride_delay_time = delayMinutes;
        ride.traffic_delay_amount = 0;
      }

      ride.ride_status = RideStatus.COMPLETED;
      ride.ride_end_time = now;

      await manager.save(ride);

      await this.createRideLog(
        manager,
        ride,
        RideStatus.COMPLETED,
        RideBookingNotes.COMPLETED,
        driverId,
      );

      await queryRunner.commitTransaction();

      return {
        success: true,
        message: 'Ride completed successfully.',
        data: {
          ride_id: ride.id,
          customer_id: ride.customer_id,
          total_fare: ride.total_fare,
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
      const manager = queryRunner.manager;
      const ride = await this.loadRideForUpdate(manager, rideId, [
        'customer',
        'driver',
      ]);

      // Ownership checks
      if (role === 'driver' && ride.driver_id !== userId) {
        throw new BadRequestException('You are not the assigned driver.');
      }
      if (role === 'customer' && ride.customer_id !== userId) {
        throw new BadRequestException('You are not the customer on this ride.');
      }

      // Terminal states
      if (
        ride.ride_status === RideStatus.CANCELLED_BY_CUSTOMER ||
        ride.ride_status === RideStatus.CANCELLED_BY_DRIVER ||
        ride.ride_status === RideStatus.COMPLETED
      ) {
        throw new BadRequestException('Cannot cancel this ride.');
      }

      // Optional: block cancel after start
      // if (ride.ride_status === RideStatus.IN_PROGRESS) {
      //   throw new BadRequestException('Ride already in progress; contact support.');
      // }

      const status =
        role === 'driver'
          ? RideStatus.CANCELLED_BY_DRIVER
          : RideStatus.CANCELLED_BY_CUSTOMER;

      ride.ride_status = status;
      ride.cancel_reason = dto.reason;
      await manager.save(ride);

      await this.createRideLog(
        manager,
        ride,
        status,
        `Cancelled: ${dto.reason}`,
        userId,
      );

      await queryRunner.commitTransaction();

      return {
        success: true,
        message: `Ride cancelled by ${role}.`,
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

  /* private buildOfferMeta(dto: DriverOfferDto) {
    const meta: Record<string, any> = {};
    if (dto.eta_minutes !== undefined) meta.eta = dto.eta_minutes;
    if (dto.distance_km !== undefined) meta.distance_km = dto.distance_km;
    if (dto.vehicle_label) meta.vehicle = dto.vehicle_label;
    return Object.keys(meta).length ? meta : undefined;
  } */

  private async getPickupCoords(
    manager: EntityManager,
    requestId: number,
  ): Promise<LatLng | null> {
    const routingRepo = manager.getRepository(RideRequestRouting);

    // First try type = pickup
    let pickup = await routingRepo.findOne({
      where: { request_id: requestId, type: RideLocationType.PICKUP },
    });

    if (!pickup) {
      // Fallback to seq = 0
      pickup = await routingRepo.findOne({
        where: { request_id: requestId, seq: 0 },
      });
    }

    if (!pickup) return null;
    return {
      latitude: Number(pickup.latitude),
      longitude: Number(pickup.longitude),
    };
  }
  getDriverAvgSpeedKmh(): number {
    return Number(process.env.RIDE_DRIVER_AVG_SPEED_KMH ?? 35);
  }
  /** Generate numeric OTP code (default 4 digits; change to 6 if needed). */
  private generateOtp(length = 4): string {
    const min = 10 ** (length - 1);
    const max = 10 ** length - 1;
    return Math.floor(Math.random() * (max - min + 1) + min).toString();
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

  private assertTransition(from: RideStatus, to: RideStatus) {
    // Allow same-state transitions for idempotency
    if (from === to) return;

    const allowed: Record<RideStatus, RideStatus[]> = {
      [RideStatus.REQUESTED]: [RideStatus.CONFIRMED],
      [RideStatus.DRIVER_OFFERED]: [RideStatus.CONFIRMED],
      [RideStatus.CONFIRMED]: [
        RideStatus.ARRIVED,
        RideStatus.CANCELLED_BY_CUSTOMER,
        RideStatus.CANCELLED_BY_DRIVER,
      ],
      [RideStatus.ARRIVED]: [
        RideStatus.IN_PROGRESS,
        RideStatus.CANCELLED_BY_CUSTOMER,
        RideStatus.CANCELLED_BY_DRIVER,
      ],
      [RideStatus.IN_PROGRESS]: [
        RideStatus.COMPLETED,
        RideStatus.CANCELLED_BY_CUSTOMER,
        RideStatus.CANCELLED_BY_DRIVER,
      ],
      [RideStatus.COMPLETED]: [],
      [RideStatus.CANCELLED_BY_CUSTOMER]: [],
      [RideStatus.CANCELLED_BY_DRIVER]: [],
      [RideStatus.EXPIRED]: [],
      [RideStatus.CUSTOMER_SELECTED]: [],
      [RideStatus.DRIVER_EN_ROUTE]: []
    };

    const allowedTargets = allowed[from] ?? [];
    if (!allowedTargets.includes(to)) {
      throw new BadRequestException(
        `Cannot change ride from ${from} to ${to}.`,
      );
    }
  }

  private async loadRideForUpdate(
    manager: EntityManager,
    rideId: number,
    relations: string[] = [],
  ) {
    const ride = await manager.findOne(RideBooking, {
      where: { id: rideId },
      relations,
      lock: { mode: 'pessimistic_write' },
    });
    if (!ride) throw new NotFoundException('Ride not found');
    return ride;
  }
}
