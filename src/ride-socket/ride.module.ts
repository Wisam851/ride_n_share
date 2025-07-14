import { Module } from '@nestjs/common';
import { RideGateway } from './ride-socket.gateway';
import { RideBookingModule } from 'src/ride-booking/ride-booking.module';
import { UserGateway } from './gateways/user.gateway';
import { DriverGateway } from './gateways/driver.gateway';
import { SocketRegisterService } from './socket-registry.service';

@Module({
  imports: [RideBookingModule],
  providers: [RideGateway, UserGateway, DriverGateway, SocketRegisterService],
})
export class RideModule {}
