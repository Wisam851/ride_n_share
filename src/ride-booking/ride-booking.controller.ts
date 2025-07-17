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
  ConfirmRideDto,
  DriverOfferDto,
  RideRequestDto,
} from './dtos/create-ride-booking.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { UserJwtAuthGuard } from 'src/auth/user/user-jwt.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';

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
    return this.service.offerRide(dto.requestId, driverId);
  }

  // 3. Customer Confirms Driver (Booking Created)
  @Roles('customer')
  @Post('confirm')
  confirmRide(
    @Body() dto: ConfirmRideDto,
    @CurrentUser('id') customerId: number,
  ) {
    return this.service.confirmRide(dto.requestId, dto.driverId, customerId);
  }

  @Roles('driver')
  @Get('arrived-ride/:id')
  arrivedRide(@Param('id') id: number, @CurrentUser('id') driver: number) {
    return this.service.arrivedRide(id, driver);
  }

  @Roles('driver')
  @Get('start-ride/:id')
  verifyStartRide(
    @Param('id') id: number,
    @CurrentUser('id') driverId: number,
  ) {
    return this.service.verifyAndStartRide(id, driverId);
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
}
