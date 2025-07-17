import { RideRequestDto } from "src/ride-booking/dtos/create-ride-booking.dto";
import { RideStatus } from "../enums/ride-booking.enum";

export interface RideRequestMem {
  id: number;
  customerId: number;
  dto: RideRequestDto;
  offers: number[]; // driver IDs
  status: RideStatus;
}