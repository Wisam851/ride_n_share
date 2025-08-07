import { Module } from '@nestjs/common';
import { RideBookingModule } from 'src/ride-booking/ride-booking.module';
import { DriverGateway } from './gateways/driver.gateway';
import { SocketRegisterService } from './socket-registry.service';
import { CustomerGateway } from './gateways/customer.gateway';
import { RatingService } from 'src/Rating/rating.service';
import { RatingModule } from 'src/Rating/rating.module';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports: [RideBookingModule, RatingModule, NotificationModule],
  providers: [
    CustomerGateway,
    DriverGateway,
    SocketRegisterService,
    RatingService,
  ],
  exports: [CustomerGateway, DriverGateway, SocketRegisterService],
})
export class RideModule {}
