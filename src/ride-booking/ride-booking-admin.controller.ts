import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common';
import { RideBookingService } from './ride-booking.service';

@Controller('ride-bookings-history')
export class RideBookingAdminController {
  constructor(private readonly service: RideBookingService) {}

  // Admin can view all ride bookings
  @Get('history')
  async getRideHistory(
    @Query('startDate') startDate?: Date,
    @Query('endDate') endDate?: Date,
    @Query('driverId', ParseIntPipe) driverId?: number,
    @Query('customerId', ParseIntPipe) customerId?: number,
  ) {
    if (startDate) {
      startDate = new Date(startDate);
    }
    if (endDate) {
      endDate = new Date(endDate);
    }

    return this.service.rideHistory(startDate, endDate, driverId, customerId);
  }

  @Get('history/logs')
  async getRideLogsHistory(
    @Query('startDate') startDate?: Date,
    @Query('endDate') endDate?: Date,
    @Query('driverId', ParseIntPipe) driverId?: number,
    @Query('customerId', ParseIntPipe) customerId?: number,
    @Query('rideId', ParseIntPipe) rideId?: number,
  ) {
    if (startDate) {
      startDate = new Date(startDate);
    }
    if (endDate) {
      endDate = new Date(endDate);
    }

    return this.service.rideLogsHistory(startDate, endDate, driverId, customerId, rideId);
  }
}
