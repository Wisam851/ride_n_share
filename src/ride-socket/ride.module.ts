import { Module } from '@nestjs/common';
import { RideGateway } from './ride-socket.gateway';
import { RideBookingModule } from 'src/ride-booking/ride-booking.module';

@Module({
  imports: [RideBookingModule],
  providers: [RideGateway],
})
export class RideModule {}
