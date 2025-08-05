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
import { Rating } from 'src/Rating/entity/rating.entity';

@Injectable()
export class RideBookingService {
  private rideRequests = new Map<number, RideRequestMem>();
  private requestCounter = 1;
  // verifyAndStartRide: any;
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

  async verifyAndStartRide(rideId: number, driverId: number) {
    const ride = await this.rideBookRepo.findOne({
      where: { id: rideId },
    });

    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    if (ride.driver_id !== driverId) {
      throw new ForbiddenException(
        'You are not the assigned driver for this ride',
      );
    }

    // ✅ Transition validation (instead of hardcoded check)
    this.assertTransition(ride.ride_status, RideStatus.STARTED);

    ride.ride_status = RideStatus.STARTED;
    ride.ride_start_time = new Date();

    await this.rideBookRepo.save(ride);

    await this.createRideLog(
      this.dataSource.manager,
      ride,
      RideStatus.STARTED,
      'Ride started by driver',
      driverId,
    );

    return {
      success: true,
      message: 'Ride started successfully',
      data: ride,
    };
  }

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
          base_fare: expectedFare.base_fare,
          total_fare: expectedFare.total_fare,
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
  // async offerRide(requestId: number, driverId: number, dto: DriverOfferDto) {
  //   const queryRunner = this.dataSource.createQueryRunner();
  //   await queryRunner.connect();
  //   await queryRunner.startTransaction();

  //   try {
  //     // --- lock ride request row ---
  //     const rideRequest = await queryRunner.manager.findOne(RideRequest, {
  //       where: { id: requestId },
  //       lock: { mode: 'pessimistic_write' },
  //     });
  //     if (!rideRequest)
  //       throw new BadRequestException('Ride request not found.');

  //     // --- driver exists? ---
  //     const driver = await queryRunner.manager.findOne(User, {
  //       where: { id: driverId },
  //     });
  //     if (!driver) throw new BadRequestException('Driver Not Registered.');

  //     // --- status ok? ---
  //     if (
  //       rideRequest.status !== RideStatus.REQUESTED &&
  //       rideRequest.status !== RideStatus.DRIVER_OFFERED
  //     ) {
  //       throw new BadRequestException(
  //         `Ride request not offerable in current status: ${rideRequest.status}`,
  //       );
  //     }

  //     // --- request not expired ---
  //     const now = new Date();
  //     if (rideRequest.expires_at && rideRequest.expires_at <= now) {
  //       throw new BadRequestException('Ride request already expired.');
  //     }

  //     // --- get pickup coords from routing ---
  //     const pickup = await this.getPickupCoords(queryRunner.manager, requestId);
  //     const dropoff = await this.getDropoffCoords(
  //       queryRunner.manager,
  //       requestId,
  //     );

  //     // pickup may be null if bad data; we continue but no distance calc
  //     let distanceKm: number | null = null;
  //     let etaMin: number | null = null;
  //     if (pickup) {
  //       distanceKm = haversineKm(
  //         { latitude: dto.latitude, longitude: dto.longitude },
  //         pickup,
  //       );
  //       etaMin = estimateEtaMinutes(distanceKm, this.getDriverAvgSpeedKmh());
  //     }

  //     // build meta to store on offer
  //     const meta = {
  //       driver_lat: dto.latitude,
  //       driver_lng: dto.longitude,
  //       pickup_lat: pickup?.latitude ?? null,
  //       pickup_lng: pickup?.longitude ?? null,
  //       pickup_address: pickup?.address ?? null,
  //       dropoff_lat: dropoff?.latitude ?? null,
  //       dropoff_lng: dropoff?.longitude ?? null,
  //       dropoff_address: dropoff?.address ?? null,
  //       distance_km: distanceKm,
  //       eta_min: etaMin,
  //     };

  //     // --- upsert offer ---
  //     const offerRepo = queryRunner.manager.getRepository(RideDriverOffer);
  //     const expiresAt = new Date(Date.now() + this.OFFER_LIFETIME_MS);

  //     let offer = await offerRepo.findOne({
  //       where: { request_id: requestId, driver_id: driverId },
  //       lock: { mode: 'pessimistic_write' },
  //     });

  //     if (!offer) {
  //       offer = offerRepo.create({
  //         request_id: requestId,
  //         rideRequest,
  //         driver_id: driverId,
  //         offered_at: now,
  //         expires_at: expiresAt,
  //         status: RideDriverOfferStatus.ACTIVE,
  //         meta_json: meta,
  //       });
  //       await offerRepo.save(offer);
  //     } else {
  //       if (
  //         ![
  //           RideDriverOfferStatus.SELECTED,
  //           RideDriverOfferStatus.REJECTED,
  //           RideDriverOfferStatus.WITHDRAWN,
  //         ].includes(offer.status)
  //       ) {
  //         offer.offered_at = now;
  //         offer.expires_at = expiresAt;
  //         offer.status = RideDriverOfferStatus.ACTIVE;
  //         offer.meta_json = meta; // replace old snapshot
  //         await offerRepo.save(offer);
  //       }
  //     }

  //     // --- update request status if first offer ---
  //     if (rideRequest.status === RideStatus.REQUESTED) {
  //       rideRequest.status = RideStatus.DRIVER_OFFERED;
  //       await queryRunner.manager.save(rideRequest);
  //     }

  //     // --- audit event ---
  //     const eventRepo = queryRunner.manager.getRepository(RideRequestEvent);
  //     const event = eventRepo.create({
  //       rideRequest,
  //       event_type: 'driver_offered',
  //       actor_type: RideEventActorType.DRIVER,
  //       actor_id: driverId,
  //       actor: driver,
  //       payload_json: {
  //         driverId,
  //         requestId,
  //         driver_location: { lat: dto.latitude, lng: dto.longitude },
  //         distance_km: distanceKm,
  //         eta_min: etaMin,
  //       },
  //     });
  //     await eventRepo.save(event);

  //     await queryRunner.commitTransaction();

  //     const offerWithDriver = await this.dataSource
  //       .getRepository(RideDriverOffer)
  //       .findOne({
  //         where: { id: offer.id },
  //         relations: ['driver', 'rideRequest', 'rideRequest.customer'],
  //       });

  //     // Post-commit async actions (socket / expiry scheduling)
  //     // this.scheduleDriverOfferExpiry(offer.id, expiresAt);
  //     // this.socketGateway.emitDriverOffered({ requestId, driverId, offerId: offer.id });

  //     return {
  //       success: true,
  //       message: 'Driver offer recorded.',
  //       data: { driver: offerWithDriver?.driver, offer, request: rideRequest },
  //     };
  //   } catch (err) {
  //     await queryRunner.rollbackTransaction();
  //     this.handleUnknown(err);
  //   } finally {
  //     await queryRunner.release();
  //   }
  // }

  async offerRide(requestId: number, driverId: number, dto: DriverOfferDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Lock ride request row
      const rideRequest = await queryRunner.manager.findOne(RideRequest, {
        where: { id: requestId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!rideRequest) throw new BadRequestException('Ride request not found.');

      // Validate driver
      const driver = await queryRunner.manager.findOne(User, {
        where: { id: driverId },
      });

      if (!driver) throw new BadRequestException('Driver Not Registered.');

      // Validate ride request status
      if (
        rideRequest.status !== RideStatus.REQUESTED &&
        rideRequest.status !== RideStatus.DRIVER_OFFERED
      ) {
        throw new BadRequestException(
          `Ride request not offerable in current status: ${rideRequest.status}`,
        );
      }

      // Check if request expired
      const now = new Date();
      if (rideRequest.expires_at && rideRequest.expires_at <= now) {
        throw new BadRequestException('Ride request already expired.');
      }

      // Get pickup and dropoff coords
      const pickup = await this.getPickupCoords(queryRunner.manager, requestId);
      const dropoff = await this.getDropoffCoords(queryRunner.manager, requestId);

      let distanceKm: number | null = null;
      let etaMin: number | null = null;
      if (pickup) {
        distanceKm = haversineKm(
          { latitude: dto.latitude, longitude: dto.longitude },
          pickup,
        );
        etaMin = estimateEtaMinutes(distanceKm, this.getDriverAvgSpeedKmh());
      }

      // Meta for this offer
      const meta = {
        driver_lat: dto.latitude,
        driver_lng: dto.longitude,
        pickup_lat: pickup?.latitude ?? null,
        pickup_lng: pickup?.longitude ?? null,
        pickup_address: pickup?.address ?? null,
        dropoff_lat: dropoff?.latitude ?? null,
        dropoff_lng: dropoff?.longitude ?? null,
        dropoff_address: dropoff?.address ?? null,
        distance_km: distanceKm,
        eta_min: etaMin,
      };

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
          offer.meta_json = meta;
          await offerRepo.save(offer);
        }
      }

      // If first offer, update request status
      if (rideRequest.status === RideStatus.REQUESTED) {
        rideRequest.status = RideStatus.DRIVER_OFFERED;
        await queryRunner.manager.save(rideRequest);
      }

      // Audit event
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

      // Load driver with vehicle details
      const offerWithDriver = await this.dataSource
        .getRepository(RideDriverOffer)
        .findOne({
          where: { id: offer.id },
          relations: [
            'driver',
            'driver.userVehicles',
            'driver.userVehicles.vehicle',
            'rideRequest',
            'rideRequest.customer',
          ],
        });

      const fullDriver = offerWithDriver?.driver;
      const vehicle = fullDriver?.userVehicles?.[0]?.vehicle ?? null;

      return {
        success: true,
        message: 'Driver offer recorded.',
        data: {
          driver: {
            id: fullDriver?.id,
            name: fullDriver?.name,
            phone: fullDriver?.phone,
            vehicle: vehicle && {
              id: vehicle.id,
              name: vehicle.vehicleName,
              model: vehicle.vehiclemodel,
              registrationNumber: vehicle.registrationNumber,
              color: vehicle.color,
              image: vehicle.images,
              certificateBack: vehicle.vehicle_certificate_back,
              photo: vehicle.vehicle_photo,
              seats: vehicle.seats_count,
            },
          },
          offer,
          request: rideRequest,
        },
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

  // async confirmDriver(requestId: number, driverId: number, customerId: number) {
  //   const queryRunner = this.dataSource.createQueryRunner();
  //   await queryRunner.connect();
  //   await queryRunner.startTransaction();
  //   const usersQuery = queryRunner.manager.getRepository(User);

  //   try {
  //     const customer = await usersQuery.findOne({ where: { id: customerId } });
  //     if (!customer) throw new NotFoundException('Customer not found');

  //     const driver = await usersQuery.findOne({ where: { id: driverId } });
  //     if (!driver) throw new NotFoundException('Driver not found');

  //     if (driver.isOnline !== 1) {
  //       throw new BadRequestException('Driver is offline');
  //     }

  //     const fare_standard = await queryRunner.manager.findOne(RideFareStandard, {
  //       where: { status: 1 },
  //     });
  //     if (!fare_standard) {
  //       throw new BadRequestException('No active fare standard found');
  //     }

  //     const rideRequest = await queryRunner.manager
  //       .getRepository(RideRequest)
  //       .createQueryBuilder('req')
  //       .where('req.id = :id', { id: requestId })
  //       .setLock('pessimistic_write')
  //       .getOne();

  //     if (!rideRequest) throw new NotFoundException('Ride request not found');
  //     if (rideRequest.customer_id !== customerId) {
  //       throw new ForbiddenException('Access denied');
  //     }
  //     if (
  //       rideRequest.status !== RideStatus.REQUESTED &&
  //       rideRequest.status !== RideStatus.DRIVER_OFFERED
  //     ) {
  //       throw new BadRequestException('Request cannot be confirmed.');
  //     }

  //     if (rideRequest.expires_at && rideRequest.expires_at <= new Date()) {
  //       throw new BadRequestException('Ride request expired.');
  //     }

  //     const expected = await this.calculateFare({
  //       ride_km: rideRequest.ride_km,
  //       ride_timing: rideRequest.ride_timing,
  //     });
  //     const expectedFare = expected.data;
  //     if (!expectedFare) {
  //       throw new BadRequestException('Failed to calculate expected fare');
  //     }

  //     const expectedTotal = Number(expectedFare.total_fare);
  //     const expectedBase = Number(expectedFare.base_fare);
  //     const requestTotal = Number(rideRequest.total_fare);
  //     const requestBase = Number(rideRequest.base_fare);

  //     if (expectedTotal !== requestTotal || expectedBase !== requestBase) {
  //       throw new BadRequestException('The fare did not match');
  //     }

  //     const offerRepo = queryRunner.manager.getRepository(RideDriverOffer);
  //     const offers = await offerRepo
  //       .createQueryBuilder('o')
  //       .where('o.request_id = :id', { id: requestId })
  //       .setLock('pessimistic_write')
  //       .getMany();

  //     const selectedOffer = offers.find((o) => o.driver_id === driverId);
  //     if (!selectedOffer) {
  //       throw new BadRequestException('Driver did not offer for this request.');
  //     }
  //     if (selectedOffer.status !== RideDriverOfferStatus.ACTIVE) {
  //       throw new BadRequestException('Offer is no longer active.');
  //     }

  //     selectedOffer.status = RideDriverOfferStatus.SELECTED;
  //     await offerRepo.save(selectedOffer);

  //     for (const offer of offers) {
  //       if (
  //         offer.id !== selectedOffer.id &&
  //         offer.status === RideDriverOfferStatus.ACTIVE
  //       ) {
  //         offer.status = RideDriverOfferStatus.REJECTED;
  //         await offerRepo.save(offer);
  //       }
  //     }

  //     const booking = queryRunner.manager.create(RideBooking, {
  //       ride_type: rideRequest.ride_type,
  //       customer_id: rideRequest.customer_id,
  //       driver_id: driverId,
  //       fare_standard_id: rideRequest.fare_standard_id,
  //       ride_km: rideRequest.ride_km,
  //       ride_timing: rideRequest.ride_timing,
  //       base_fare: expectedFare.base_fare,
  //       total_fare: expectedFare.total_fare,
  //       discount: expectedFare.discount,
  //       additional_cost: expectedFare.additional_cost,
  //       surcharge_amount: expectedFare.surcharge_amount,
  //       company_fees_amount: expectedFare.company_fees_amount,
  //       app_fees_amount: expectedFare.app_fees_amount,
  //       driver_fees_amount: expectedFare.driver_fees_amount,
  //       ride_status: RideStatus.CONFIRMED,
  //       otp_code: this.generateOtp(6),
  //       created_by: rideRequest.customer_id,
  //     });
  //     await queryRunner.manager.save(booking);

  //     const reqRouting = await queryRunner.manager.find(RideRequestRouting, {
  //       where: { request_id: requestId },
  //       order: { seq: 'ASC' },
  //     });

  //     const routingEntities = reqRouting.map((r) =>
  //       queryRunner.manager.create(RideRouting, {
  //         ride_id: booking.id,
  //         type: r.type,
  //         latitude: r.latitude,
  //         longitude: r.longitude,
  //         address: r.address,
  //         created_by: customerId,
  //       }),
  //     );
  //     await queryRunner.manager.save(RideRouting, routingEntities);

  //     const driverMeta = selectedOffer.meta_json || {};
  //     const driverLat = driverMeta.driver_lat || driverMeta.latitude;
  //     const driverLng = driverMeta.driver_lng || driverMeta.longitude;

  //     if (!driverLat || !driverLng) {
  //       throw new BadRequestException('Driver location missing in offer meta.');
  //     }

  //     const driverRouting = queryRunner.manager.create(RideRouting, {
  //       ride_id: booking.id,
  //       type: RideLocationType.DRIVER_LOCATION,
  //       latitude: driverLat,
  //       longitude: driverLng,
  //       address: driverMeta.address || 'Driver current location',
  //       created_by: driverId,
  //     });
  //     await queryRunner.manager.save(driverRouting);

  //     rideRequest.status = RideStatus.CONFIRMED;
  //     rideRequest.confirmed_driver_id = driverId;
  //     rideRequest.confirmed_booking_id = booking.id;
  //     await queryRunner.manager.save(rideRequest);

  //     const eventRepo = queryRunner.manager.getRepository(RideRequestEvent);
  //     const confirmEvents = [
  //       eventRepo.create({
  //         request_id: rideRequest.id,
  //         event_type: 'customer_selected_driver',
  //         actor_type: RideEventActorType.CUSTOMER,
  //         actor_id: customerId,
  //         payload_json: { driverId },
  //       }),
  //       eventRepo.create({
  //         request_id: rideRequest.id,
  //         event_type: 'request_confirmed',
  //         actor_type: RideEventActorType.SYSTEM,
  //         payload_json: { bookingId: booking.id },
  //       }),
  //     ];
  //     await eventRepo.save(confirmEvents);

  //     await this.createRideLog(
  //       queryRunner.manager,
  //       booking,
  //       RideStatus.CONFIRMED,
  //       RideBookingNotes.CONFIRMED,
  //       driverId,
  //     );

  //     // ⭐ NEW: Get rating of customer
  //     const ratingRepo = queryRunner.manager.getRepository(Rating);
  //     const ratings = await ratingRepo.find({
  //       where: { user_id: customerId },
  //     });

  //     const customer_rating =
  //       ratings.length > 0
  //         ? parseFloat(
  //             (
  //               ratings.reduce((sum, r) => sum + (r.rating || 0), 0) /
  //               ratings.length
  //             ).toFixed(1),
  //           )
  //         : 0;

  //     const allRouting = await queryRunner.manager.find(RideRouting, {
  //       where: { ride_id: booking.id },
  //       order: { id: 'ASC' },
  //     });

  //     const pickup = allRouting.find((r) => r.type === RideLocationType.PICKUP);
  //     const dropoff = allRouting.find(
  //       (r) => r.type === RideLocationType.DROPOFF,
  //     );

  //     await queryRunner.commitTransaction();

  //     return {
  //       success: true,
  //       bookingId: booking.id,
  //       data: {
  //         ride: booking,
  //         customer,
  //         driver,
  //         pickup,
  //         dropoff,
  //         fare: expectedFare,
  //         customer_rating,
  //       },
  //     };
  //   } catch (err) {
  //     await queryRunner.rollbackTransaction();
  //     this.handleUnknown(err);
  //   } finally {
  //     await queryRunner.release();
  //   }
  // }

  async confirmDriver(requestId: number, driverId: number, customerId: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    const usersQuery = queryRunner.manager.getRepository(User);

    try {
      const customer = await usersQuery.findOne({ where: { id: customerId } });
      if (!customer) throw new NotFoundException('Customer not found');

      const driver = await usersQuery.findOne({ where: { id: driverId } });
      if (!driver) throw new NotFoundException('Driver not found');

      if (driver.isOnline !== 1) {
        throw new BadRequestException('Driver is offline');
      }

      const fare_standard = await queryRunner.manager.findOne(
        RideFareStandard,
        {
          where: { status: 1 },
        },
      );
      if (!fare_standard) {
        throw new BadRequestException('No active fare standard found');
      }

      const rideRequest = await queryRunner.manager
        .getRepository(RideRequest)
        .createQueryBuilder('req')
        .where('req.id = :id', { id: requestId })
        .setLock('pessimistic_write')
        .getOne();

      if (!rideRequest) throw new NotFoundException('Ride request not found');
      if (rideRequest.customer_id !== customerId) {
        throw new ForbiddenException('Access denied');
      }
      if (
        rideRequest.status !== RideStatus.REQUESTED &&
        rideRequest.status !== RideStatus.DRIVER_OFFERED
      ) {
        throw new BadRequestException('Request cannot be confirmed.');
      }

      if (rideRequest.expires_at && rideRequest.expires_at <= new Date()) {
        throw new BadRequestException('Ride request expired.');
      }

      const expected = await this.calculateFare({
        ride_km: rideRequest.ride_km,
        ride_timing: rideRequest.ride_timing,
      });
      const expectedFare = expected.data;
      if (!expectedFare) {
        throw new BadRequestException('Failed to calculate expected fare');
      }

      const expectedTotal = Number(expectedFare.total_fare);
      const expectedBase = Number(expectedFare.base_fare);
      const requestTotal = Number(rideRequest.total_fare);
      const requestBase = Number(rideRequest.base_fare);

      if (expectedTotal !== requestTotal || expectedBase !== requestBase) {
        throw new BadRequestException('The fare did not match');
      }

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

      const otp = this.generateOtp(4);

      const booking = queryRunner.manager.create(RideBooking, {
        ride_type: rideRequest.ride_type,
        customer_id: rideRequest.customer_id,
        driver_id: driverId,
        fare_standard_id: rideRequest.fare_standard_id,
        ride_km: rideRequest.ride_km,
        ride_timing: rideRequest.ride_timing,
        base_fare: expectedFare.base_fare,
        total_fare: expectedFare.total_fare,
        discount: expectedFare.discount,
        additional_cost: expectedFare.additional_cost,
        surcharge_amount: expectedFare.surcharge_amount,
        company_fees_amount: expectedFare.company_fees_amount,
        app_fees_amount: expectedFare.app_fees_amount,
        driver_fees_amount: expectedFare.driver_fees_amount,
        ride_status: RideStatus.CONFIRMED,
        otp_code: otp,
        created_by: rideRequest.customer_id,
      });
      await queryRunner.manager.save(booking);

      const reqRouting = await queryRunner.manager.find(RideRequestRouting, {
        where: { request_id: requestId },
        order: { seq: 'ASC' },
      });

      const routingEntities = reqRouting.map((r) =>
        queryRunner.manager.create(RideRouting, {
          ride_id: booking.id,
          type: r.type,
          latitude: r.latitude,
          longitude: r.longitude,
          address: r.address,
          created_by: customerId,
        }),
      );
      await queryRunner.manager.save(RideRouting, routingEntities);

      const driverMeta = selectedOffer.meta_json || {};
      const driverLat = driverMeta.driver_lat ?? driverMeta.latitude ?? null;
      const driverLng = driverMeta.driver_lng ?? driverMeta.longitude ?? null;

      if (!driverLat || !driverLng) {
        throw new BadRequestException('Driver location missing in offer meta.');
      }

      const driverRouting = queryRunner.manager.create(RideRouting, {
        ride_id: booking.id,
        type: RideLocationType.DRIVER_LOCATION,
        latitude: driverLat,
        longitude: driverLng,
        address: driverMeta.address || 'Driver current location',
        created_by: driverId,
      });
      await queryRunner.manager.save(driverRouting);

      rideRequest.status = RideStatus.CONFIRMED;
      rideRequest.confirmed_driver_id = driverId;
      rideRequest.confirmed_booking_id = booking.id;
      await queryRunner.manager.save(rideRequest);

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

      await this.createRideLog(
        queryRunner.manager,
        booking,
        RideStatus.CONFIRMED,
        RideBookingNotes.CONFIRMED,
        driverId,
      );

      // ⭐ Rating stats
      const ratingRepo = queryRunner.manager.getRepository(Rating);
      const getUserRatingStats = async (
        userId: number,
      ): Promise<{ average: number; count: number }> => {
        const ratings = await ratingRepo.find({ where: { user_id: userId } });
        const count = ratings.length;
        const average =
          count === 0
            ? 0
            : parseFloat(
                (
                  ratings.reduce((sum, r) => sum + (r.rating || 0), 0) / count
                ).toFixed(1),
              );
        return { average, count };
      };

      const customerRating = await getUserRatingStats(customerId);
      const driverRating = await getUserRatingStats(driverId);

      const allRouting = await queryRunner.manager.find(RideRouting, {
        where: { ride_id: booking.id },
        order: { id: 'ASC' },
      });

      const pickup = allRouting.find((r) => r.type === RideLocationType.PICKUP);
      const dropoff = allRouting.find(
        (r) => r.type === RideLocationType.DROPOFF,
      );

      await queryRunner.commitTransaction();

      return {
        success: true,
        bookingId: booking.id,
        data: {
          ride: booking,
          fare: expectedFare,
          otp: booking.otp_code,
          pickup,
          dropoff,
          customer: {
            ...customer,
            rating: customerRating.average,
            rating_count: customerRating.count,
            otp: booking.otp_code,
          },
          driver: {
            ...driver,
            rating: driverRating.average,
            rating_count: driverRating.count,
            otp: booking.otp_code,
            coordinates:
              driverLat && driverLng
                ? {
                    latitude: driverLat,
                    longitude: driverLng,
                  }
                : null,
          },
        },
      };
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
      console.log('Ride started:', updated);
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

      // STEP 1: Lock main row
      const ride = await manager
        .createQueryBuilder(RideBooking, 'ride')
        .where('ride.id = :rideId', { rideId })
        .setLock('pessimistic_write')
        .getOne();

      if (!ride) {
        throw new NotFoundException('Ride not found.');
      }

      // STEP 2: Load fare_standard separately to avoid JOIN locking error
      if (ride.fare_standard_id) {
        const fareStandard = await manager.findOne(RideFareStandard, {
          where: { id: ride.fare_standard_id },
        });
        if (fareStandard) {
          ride.fare_standard = fareStandard;
        }
      }

      // STEP 3: Ride state validations
      if (
        ![RideStatus.IN_PROGRESS, RideStatus.STARTED].includes(ride.ride_status)
      ) {
        throw new BadRequestException(
          `Ride is not in progress. Current status: ${ride.ride_status}`,
        );
      }

      if (ride.driver_id !== driverId) {
        throw new ForbiddenException('Unauthorized ride completion.');
      }

      if (!ride.ride_start_time) {
        throw new InternalServerErrorException('Start time missing on ride.');
      }

      // STEP 4: Delay & fare calculation
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

      ride.ride_delay_time = delayMinutes;
      ride.traffic_delay_amount = trafficDelayAmount;
      ride.total_fare = Number(ride.total_fare ?? 0) + trafficDelayAmount;

      // STEP 5: Complete the ride
      ride.ride_status = RideStatus.COMPLETED;
      ride.ride_end_time = now;

      await manager.save(ride);

      // STEP 6: Log the ride
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
      this.logger.error(`❌ Error completing ride: ${err.message}`);
      throw err;
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

      // Lock only the ride row
      const ride = await manager
        .createQueryBuilder(RideBooking, 'ride')
        .where('ride.id = :rideId', { rideId })
        .setLock('pessimistic_write')
        .getOne();

      if (!ride) {
        throw new NotFoundException('Ride not found');
      }

      // Optionally load customer and driver (no lock here)
      if (ride.customer_id) {
        const customer = await manager.findOne(User, {
          where: { id: ride.customer_id },
        });
        if (customer) {
          ride.customer = customer;
        }
      }

      if (ride.driver_id) {
        const driver = await manager.findOne(User, {
          where: { id: ride.driver_id },
        });
        if (driver) {
          ride.driver = driver;
        }
      }

      // Ownership check
      if (role === 'driver' && ride.driver_id !== userId) {
        throw new BadRequestException('You are not the assigned driver.');
      }
      if (role === 'customer' && ride.customer_id !== userId) {
        throw new BadRequestException('You are not the customer on this ride.');
      }

      // Terminal state protection
      if (
        ride.ride_status === RideStatus.CANCELLED_BY_CUSTOMER ||
        ride.ride_status === RideStatus.CANCELLED_BY_DRIVER ||
        ride.ride_status === RideStatus.COMPLETED
      ) {
        throw new BadRequestException('Cannot cancel this ride.');
      }

      // Set cancel status and reason
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

  async getRideHistory(userId: number) {
    try {
      // Eager load driver, customer, fare_standard
      const rides = await this.rideBookRepo.find({
        where: [{ customer_id: userId }, { driver_id: userId }],
        order: { created_at: 'DESC' },
        relations: ['driver', 'customer', 'fare_standard'],
      });

      const getDriverVehicle = async (driverId: number) => {
        if (!driverId) return null;
        const userVehicleRepo = this.dataSource.getRepository('user_vehicles');
        // Get latest/active vehicle for driver
        const userVehicle = await userVehicleRepo.findOne({
          where: { user: { id: driverId } },
          relations: ['vehicle'],
          order: { id: 'DESC' },
        });
        if (!userVehicle || !userVehicle.vehicle) return null;
        return userVehicle.vehicle;
      };
      // Map rides to detailed summaries
      const mapRide = async (ride) => {
        const driver = ride.driver || null;
        const customer = ride.customer || null;
        const fare = ride.fare_standard || null;
        const vehicle = driver ? await getDriverVehicle(driver.id) : null;
        // Calculate platform fee
        const platform_fee =
          (ride.company_fees_amount || 0) + (ride.app_fees_amount || 0);
        // Waiting charges assumed to be in additional_cost
        const waiting_charges = ride.additional_cost || 0;
        // Fetch pickup and dropoff locations
        const routings = await this.rideRoutingRepo.find({
          where: { ride_id: ride.id },
        });
        const pickup =
          routings.find((r) => r.type === RideLocationType.PICKUP) || null;
        const dropoff =
          routings.find((r) => r.type === RideLocationType.DROPOFF) || null;
        let distance_km: number | null = null;
        if (pickup && dropoff) {
          distance_km = haversineKm(
            { latitude: pickup.latitude, longitude: pickup.longitude },
            { latitude: dropoff.latitude, longitude: dropoff.longitude },
          );
        }
        return {
          rideDetails: {
            id: ride.id,
            ride_no: ride.ride_no,
            ride_type: ride.ride_type,
            ride_status: ride.ride_status,
            booking_type: ride.ride_type,
            created_at: ride.created_at,
            updated_at: ride.updated_at,
            ride_start_time: ride.ride_start_time,
            ride_end_time: ride.ride_end_time,
            driver: driver
              ? {
                  id: driver.id,
                  name: driver.name,
                  phone: driver.phone,
                  email: driver.email,
                  image: driver.image,
                  rating: await this.getUserRatingStats(driver.id),
                }
              : null,
            customer: customer
              ? {
                  id: customer.id,
                  name: customer.name,
                  phone: customer.phone,
                  email: customer.email,
                  image: customer.image,
                  rating: await this.getUserRatingStats(customer.id),
                }
              : null,
            vehicle: vehicle
              ? {
                  id: vehicle.id,
                  vehicleName: vehicle.vehicleName,
                  registrationNumber: vehicle.registrationNumber,
                  vehiclemodel: vehicle.vehiclemodel,
                  company: vehicle.company,
                  color: vehicle.color,
                  image: vehicle.image,
                }
              : null,
            fare_summary: {
              base_fare: ride.base_fare,
              total_fare: ride.total_fare,
              discount: ride.discount,
              additional_cost: ride.additional_cost,
              additional_cost_reason: ride.additional_cost_reason,
              surcharge_amount: ride.surcharge_amount,
              company_fees_amount: ride.company_fees_amount,
              app_fees_amount: ride.app_fees_amount,
              driver_fees_amount: ride.driver_fees_amount,
              traffic_delay_amount: ride.traffic_delay_amount,
            },
          },
          summary: {
            partner_name: driver ? driver.name : null,
            plate_number: vehicle ? vehicle.registrationNumber : null,
            booking_time: ride.ride_start_time || ride.created_at,
            service_type: ride.ride_type,
          },
          receipt: {
            fare: ride.base_fare || 0,
            waiting_charges,
            discount: ride.discount || 0,
            platform_fee,
            total: ride.total_fare || 0,
            payment: null, // Placeholder for payment info
          },
          locations: {
            pickup: pickup
              ? {
                  address: pickup.address,
                  latitude: pickup.latitude,
                  longitude: pickup.longitude,
                }
              : null,
            dropoff: dropoff
              ? {
                  address: dropoff.address,
                  latitude: dropoff.latitude,
                  longitude: dropoff.longitude,
                }
              : null,
            distance_km,
          },
        };
      };

      //Get in progress rides
      const inProgressStatuses = [RideStatus.ARRIVED, RideStatus.STARTED];

      const in_progress = await Promise.all(
        rides
          .filter((r) => inProgressStatuses.includes(r.ride_status))
          .map(mapRide),
      );

      //Get completed rides
      const completedStatuses = [RideStatus.COMPLETED];

      const completed = await Promise.all(
        rides
          .filter((r) => completedStatuses.includes(r.ride_status))
          .map(mapRide),
      );

      //Get cancelled rides
      const cancelledStatuses = [
        RideStatus.CANCELLED_BY_CUSTOMER,
        RideStatus.CANCELLED_BY_DRIVER,
      ];
      const cancelled = await Promise.all(
        rides
          .filter((r) => cancelledStatuses.includes(r.ride_status))
          .map(mapRide),
      );

      return {
        success: true,
        message: 'Ride history fetched successfully',
        data: {
          in_progress,
          completed,
          cancelled,
        },
      };
    } catch (err) {
      this.handleUnknown(err);
    }
  }
  // Get request + customer id (minimal object)
  async getRequestWithCustomer(requestId: number): Promise<RideRequest | null> {
    return this.dataSource.getRepository(RideRequest).findOne({
      where: { id: requestId },
      select: ['id', 'customer_id', 'status'],
    });
  }

  // Return driver IDs that have active offers for a request
  async getOfferingDriverIds(requestId: number): Promise<number[]> {
    const rows = await this.dataSource.getRepository(RideDriverOffer).find({
      where: { request_id: requestId },
      select: ['driver_id'],
    });
    return rows.map((r) => r.driver_id);
  }

  // All drivers who offered EXCEPT the winning driver
  async getLosingDriversForRequest(
    requestId: number,
    winningDriverId: number,
  ): Promise<number[]> {
    const rows = await this.dataSource.getRepository(RideDriverOffer).find({
      where: { request_id: requestId },
      select: ['driver_id'],
    });
    return rows.map((r) => r.driver_id).filter((id) => id !== winningDriverId);
  }

  async getRideSummary(rideId: number) {
    const ride = await this.rideBookRepo.findOne({
      where: { id: rideId },
      relations: ['driver', 'customer', 'routing'],
    });

    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    const driver = ride.driver;
    const customer = ride.customer;

    const [driverRating, customerRating] = await Promise.all([
      this.getUserRatingStats(driver.id),
      this.getUserRatingStats(customer.id),
    ]);

    const pickup = ride.routing.find((r) => r.type === RideLocationType.PICKUP);
    const dropoff = ride.routing.find(
      (r) => r.type === RideLocationType.DROPOFF,
    );
    const driverLocation = ride.routing.find(
      (r) => r.type === RideLocationType.DRIVER_LOCATION,
    );

    console.log('Ride Summary working');

    return {
      id: ride.id,
      status: ride.ride_status,
      fare: {
        total: ride.total_fare,
        base: ride.base_fare,
        discount: ride.discount,
      },
      otp: ride.otp_code,
      driver: {
        id: driver.id,
        name: driver.name,
        rating: driverRating.average,
        rating_count: driverRating.count,
        phone: driver.phone,
        coordinates: driverLocation
          ? {
              latitude: driverLocation.latitude,
              longitude: driverLocation.longitude,
            }
          : null,
      },
      customer: {
        id: customer.id,
        name: customer.name,
        rating: customerRating.average,
        rating_count: customerRating.count,
      },
      pickup,
      dropoff,
      started_at: ride.ride_start_time,
      created_at: ride.created_at,
    };
  }

  private async getUserRatingStats(userId: number) {
    const ratings = await this.dataSource
      .getRepository(Rating)
      .find({ where: { user_id: userId } });

    const count = ratings.length;
    const average =
      count === 0
        ? 0
        : parseFloat(
            (
              ratings.reduce((sum, r) => sum + (r.rating || 0), 0) / count
            ).toFixed(1),
          );

    return { average, count };
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
  ): Promise<{
    latitude: number;
    longitude: number;
    address: string;
  } | null> {
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
      address: pickup.address || '',
    };
  }

  private async getDropoffCoords(
    manager: EntityManager,
    requestId: number,
  ): Promise<{
    latitude: number;
    longitude: number;
    address: string;
  } | null> {
    const routingRepo = manager.getRepository(RideRequestRouting);

    // First try type = dropoff
    let dropoff = await routingRepo.findOne({
      where: { request_id: requestId, type: RideLocationType.DROPOFF },
    });

    if (!dropoff) {
      // Fallback to seq = 0
      dropoff = await routingRepo.findOne({
        where: { request_id: requestId, seq: 0 },
      });
    }

    if (!dropoff) return null;
    return {
      latitude: Number(dropoff.latitude),
      longitude: Number(dropoff.longitude),
      address: dropoff.address || '',
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

  // private assertTransition(from: RideStatus, to: RideStatus) {
  //   // Allow same-state transitions for idempotency
  //   if (from === to) return;

  //   const allowed: Record<RideStatus, RideStatus[]> = {
  //     [RideStatus.REQUESTED]: [RideStatus.CONFIRMED],
  //     [RideStatus.DRIVER_OFFERED]: [RideStatus.CONFIRMED],
  //     [RideStatus.CONFIRMED]: [
  //       RideStatus.ARRIVED,
  //       RideStatus.STARTED, // 👈 ADD THIS LINE
  //       RideStatus.CANCELLED_BY_CUSTOMER,
  //       RideStatus.CANCELLED_BY_DRIVER,
  //     ],
  //     [RideStatus.ARRIVED]: [
  //       RideStatus.IN_PROGRESS,
  //       RideStatus.CANCELLED_BY_CUSTOMER,
  //       RideStatus.CANCELLED_BY_DRIVER,
  //     ],
  //     [RideStatus.STARTED]: [
  //       RideStatus.IN_PROGRESS,
  //       RideStatus.COMPLETED,
  //       RideStatus.CANCELLED_BY_CUSTOMER,
  //       RideStatus.CANCELLED_BY_DRIVER,
  //     ],
  //     [RideStatus.IN_PROGRESS]: [
  //       RideStatus.COMPLETED,
  //       RideStatus.CANCELLED_BY_CUSTOMER,
  //       RideStatus.CANCELLED_BY_DRIVER,
  //     ],
  //     [RideStatus.COMPLETED]: [],
  //     [RideStatus.CANCELLED_BY_CUSTOMER]: [],
  //     [RideStatus.CANCELLED_BY_DRIVER]: [],
  //     [RideStatus.EXPIRED]: [],
  //     [RideStatus.CUSTOMER_SELECTED]: [],
  //     [RideStatus.DRIVER_EN_ROUTE]: [],
  //   };

  //   const allowedTargets = allowed[from] ?? [];
  //   if (!allowedTargets.includes(to)) {
  //     throw new BadRequestException(
  //       `Cannot change ride from ${from} to ${to}.`,
  //     );
  //   }
  // }

  private assertTransition(from: RideStatus, to: RideStatus) {
    if (from === to) return;

    const allowed: Record<RideStatus, RideStatus[]> = {
      [RideStatus.REQUESTED]: [RideStatus.CONFIRMED],
      [RideStatus.DRIVER_OFFERED]: [RideStatus.CONFIRMED],
      [RideStatus.CONFIRMED]: [
        RideStatus.ARRIVED,
        RideStatus.STARTED,
        RideStatus.CANCELLED_BY_CUSTOMER,
        RideStatus.CANCELLED_BY_DRIVER,
      ],
      [RideStatus.ARRIVED]: [
        RideStatus.STARTED,
        RideStatus.IN_PROGRESS,
        RideStatus.CANCELLED_BY_CUSTOMER,
        RideStatus.CANCELLED_BY_DRIVER,
      ],
      [RideStatus.STARTED]: [
        RideStatus.IN_PROGRESS,
        RideStatus.COMPLETED,
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
      [RideStatus.DRIVER_EN_ROUTE]: [],
    };

    const allowedTargets = allowed[from] ?? [];

    console.log('🚦 Ride transition check:', {
      from,
      to,
      allowedTargets,
      isAllowed: allowedTargets.includes(to),
    });

    if (!allowedTargets.includes(to)) {
      throw new BadRequestException(
        `Cannot change ride from ${from} to ${to}.`,
      );
    }
  }

  async loadRideForUpdate(
    manager: EntityManager,
    rideId: number,
  ): Promise<RideBooking> {
    // 1. Lock only the RideBooking table (not its relations)
    const ride = await manager
      .createQueryBuilder(RideBooking, 'ride')
      .where('ride.id = :rideId', { rideId })
      .setLock('pessimistic_write') // ✅ this is safe now
      .getOne();

    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    // 2. Load fare_standard separately to avoid LEFT JOIN lock issues
    if (ride.fare_standard_id) {
      const fareStandard = await manager.findOne(RideFareStandard, {
        where: { id: ride.fare_standard_id },
      });
      if (fareStandard) {
        ride.fare_standard = fareStandard;
      }
    }

    return ride;
  }

  async getMonthlyEarning(driverId: number) {
    try {
      const driver = await this.userRepo.findOne({
        where: { id: driverId },
      });

      if (!driver) {
        throw new NotFoundException(`Driver with ID ${driverId} not found`);
      }

      const currentDate = new Date();
      const startOfMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1,
      );
      const endOfMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );

      const result = await this.rideBookRepo
        .createQueryBuilder('ride')
        .select('SUM(ride.total_fare)', 'totalEarnings')
        .where('ride.driver_id = :driverId', { driverId })
        .andWhere('ride.ride_status = :status', {
          status: RideStatus.COMPLETED,
        })
        .andWhere('ride.created_at >= :startOfMonth', { startOfMonth })
        .andWhere('ride.created_at <= :endOfMonth', { endOfMonth })
        .getRawOne();

      const totalEarnings = parseFloat(result?.totalEarnings || '0');

      return {
        success: true,
        message: 'Ride history fetched successfully',
        data: {
          totalEarnings,
          month: currentDate.toLocaleString('default', {
            month: 'long',
            year: 'numeric',
          }),
          startDate: startOfMonth,
          endDate: endOfMonth,
        },
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to fetch monthly earnings',
      );
    }
  }

  async getTodayEarning(driverId: number) {
    try {
      const driver = await this.userRepo.findOne({
        where: { id: driverId },
      });

      if (!driver) {
        throw new NotFoundException(`Driver with ID ${driverId} not found`);
      }

      const currentDate = new Date();
      const startOfDay = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        currentDate.getDate(),
        0,
        0,
        0,
      );
      const endOfDay = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        currentDate.getDate(),
        23,
        59,
        59,
        999,
      );

      const result = await this.rideBookRepo
        .createQueryBuilder('ride')
        .select('SUM(ride.total_fare)', 'totalEarnings')
        .where('ride.driver_id = :driverId', { driverId })
        .andWhere('ride.ride_status = :status', {
          status: RideStatus.COMPLETED,
        })
        .andWhere('ride.created_at >= :startOfDay', { startOfDay })
        .andWhere('ride.created_at <= :endOfDay', { endOfDay })
        .getRawOne();

      const totalEarnings = parseFloat(result?.totalEarnings || '0');

      return {
        success: true,
        message: "Today's earnings fetched successfully",
        data: {
          totalEarnings,
          date: currentDate.toLocaleDateString(),
          startDate: startOfDay,
          endDate: endOfDay,
        },
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        "Failed to fetch today's earnings",
      );
    }
  }

  async getRecentPlaces(userId: number) {
    const rides = await this.rideBookRepo.find({
      where: { customer_id: userId },
      order: { id: 'DESC' },
      take: 20,
      relations: ['routing'],
    });

    const places: {
      address: string;
      latitude: number;
      longitude: number;
      type: string;
    }[] = [];

    for (const ride of rides) {
      if (ride.routing && Array.isArray(ride.routing)) {
        for (const route of ride.routing) {
          if (route.type === RideLocationType.DROPOFF) {
            places.push({
              address: route.address,
              latitude: route.latitude,
              longitude: route.longitude,
              type: route.type,
            });
          }
        }
      }
    }

    const uniquePlaces: typeof places = [];
    const seen = new Set();
    for (const place of places) {
      const key = `${place.address}|${place.latitude}|${place.longitude}|${place.type}`;
      if (!seen.has(key)) {
        uniquePlaces.push(place);
        seen.add(key);
      }
    }

    return {
      success: true,
      message: 'Recent places fetched successfully',
      data: uniquePlaces,
    };
  }
}
