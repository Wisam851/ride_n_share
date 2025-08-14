import {
  Controller,
  Get,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RideBookingService } from './ride-booking.service';
import { AdminJwtAuthGuard } from 'src/auth/admin/admin-jwt.guard';

@UseGuards(AdminJwtAuthGuard)
@Controller('admin/ride-bookings-history')
export class RideBookingAdminController {
  constructor(private readonly service: RideBookingService) {}

  // Admin can view all ride bookings
  @Get('list')
  async getRideHistory(
    @Query('startDate') startDate?: Date,
    @Query('endDate') endDate?: Date,
    @Query('driverId') driverId?: number,
    @Query('customerId') customerId?: number,
  ) {
    if (startDate) {
      startDate = new Date(startDate);
    }
    if (endDate) {
      endDate = new Date(endDate);
    }
    const driverIdNumber = driverId
      ? parseInt(driverId.toString(), 10)
      : undefined;
    const customerIdNumber = customerId
      ? parseInt(customerId.toString(), 10)
      : undefined;
    return this.service.rideHistory(
      startDate,
      endDate,
      driverIdNumber,
      customerIdNumber,
    );
  }

  @Get('logs')
  async getRideLogsHistory(
    @Query('startDate') startDate?: Date,
    @Query('endDate') endDate?: Date,
    @Query('rideId') rideId?: number,
  ) {
    if (startDate) {
      startDate = new Date(startDate);
    }
    if (endDate) {
      endDate = new Date(endDate);
    }
    const rideIdNumber = rideId ? parseInt(rideId.toString(), 10) : undefined;

    return this.service.rideLogsHistory(
      startDate,
      endDate,
      rideIdNumber,
    );
  }
}
