import { Module } from '@nestjs/common';
import { RideBookingModule } from 'src/ride-booking/ride-booking.module';
import { DriverGateway } from './gateways/driver.gateway';
import { SocketRegisterService } from './socket-registry.service';
import { CustomerGateway } from './gateways/customer.gateway';

@Module({
  imports: [RideBookingModule],
  providers: [CustomerGateway, DriverGateway, SocketRegisterService],
})
export class RideModule {}
