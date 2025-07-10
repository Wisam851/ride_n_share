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
  AcceptRideDto,
  CalculateFareDto,
  CancelRideDto,
  RideBookingDto,
  UpdateRideBookingDto,
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
  @Roles('customer')
  @Post('booking')
  create(@Body() dto: RideBookingDto, @CurrentUser('id') customerId: number) {
    return this.service.create(dto, customerId);
  }

  @Roles('driver')
  @Post('accept-ride/:id')
  acceptRide(
    @Param('id') id: number,
    @CurrentUser('id') driverId: number,
    @Body() dto: AcceptRideDto,
  ) {
    return this.service.acceptRide(id, driverId, dto);
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
