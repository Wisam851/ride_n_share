import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RideBookingService } from './ride-booking.service';
import {
  CalculateFareDto,
  CancelRideDto,
  ConfirmDriverDto,
  DriverOfferDto,
  RideRequestDto,
} from './dtos/ride-booking.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { UserJwtAuthGuard } from 'src/auth/user/user-jwt.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { User } from 'src/users/entity/user.entity';

@UseGuards(UserJwtAuthGuard, RolesGuard)
@Controller('ride-bookings')
export class RideBookingController {
  constructor(private readonly service: RideBookingService) {}

  @Post('calculate-fare')
  calculateFare(@Body() dto: CalculateFareDto) {
    return this.service.calculateFare(dto);
  }
  // 1. Customer Requests a Ride
  @Roles('customer')
  @Post('request')
  requestRide(
    @Body() dto: RideRequestDto,
    @CurrentUser('id') customerId: number,
  ) {
    return this.service.requestRide(dto, customerId);
  }

  // 2. Driver Offers (Accepts Request)
  @Roles('driver')
  @Post('offer')
  offerRide(@Body() dto: DriverOfferDto, @CurrentUser('id') driverId: number) {
    return this.service.offerRide(dto.requestId, driverId, dto);
  }

  // 3. Customer Confirms Driver (Booking Created)
  @Roles('customer')
  @Post('confirm')
  async confirmDriver(
    @Body() dto: ConfirmDriverDto,
    @CurrentUser() user: User,
  ) {
    return this.service.confirmDriver(dto.requestId, dto.driverId, user.id);
  }

  @Roles('driver')
  @Get('arrived-ride/:id')
  arrivedRide(@Param('id') id: number, @CurrentUser('id') driver: number) {
    console.log('hello');
    return this.service.arrivedRide(id, driver);
  }

  @Roles('driver')
  @Get('start-ride/:id')
  verifyStartRide(
    @Param('id') id: number,
    @CurrentUser('id') driverId: number,
  ) {
    return this.service.startRide(id, driverId);
  }

  @Roles('driver')
  @Get('complete-ride/:id')
  completeRide(@Param('id') id: number, @CurrentUser('id') driverId: number) {
    return this.service.completeRide(id, driverId);
  }

  @Roles('driver', 'customer')
  @Post('cancel-ride/:id')
  cancelRide(
    @Param('id') id: number,
    @CurrentUser('id') userId: number,
    @CurrentUser() user: any,
    @Body() dto: CancelRideDto,
  ) {
    const role = user.roles.includes('driver') ? 'driver' : 'customer';
    return this.service.cancelRide(id, userId, dto, role);
  }

  @Roles('driver', 'customer')
  @Get('history')
  async getRideHistory(@CurrentUser('id') userId: number) {
    return this.service.getRideHistory(userId);
  }

  @Roles('driver')
  @Get('get-monthly-earning')
  getMonthlyEarning(@CurrentUser('id') driverId: number) {
    return this.service.getMonthlyEarning(driverId);
  }

  @Roles('driver')
  @Get('get-today-earning')
  getTodayEarning(@CurrentUser('id') driverId: number) {
    return this.service.getTodayEarning(driverId);
  }
}
