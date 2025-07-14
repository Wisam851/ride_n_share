import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import {
  RideLocationType,
  RideStatus,
  RideType,
} from 'src/common/enums/ride-booking.enum';

export class RideBookingDto {
  @IsNotEmpty()
  @IsEnum(RideType)
  type: RideType;

  @IsOptional()
  @IsNumber()
  driver_id: number;

  @IsOptional()
  @IsNumber()
  fare_id: number;

  @IsOptional()
  @IsNumber()
  discount?: number;

  @IsOptional()
  @IsNumber()
  additional_costs?: number;

  @IsOptional()
  @IsNumber()
  driver_fees_amount?: number;

  @IsOptional()
  @IsNumber()
  company_fees_amount?: number;

  @IsOptional()
  @IsNumber()
  app_fees_amount?: number;

  @IsOptional()
  @IsNumber()
  traffic_delay_amount?: number;

  @IsOptional()
  @IsNumber()
  surcharge_amount?: number;

  @IsOptional()
  @IsNumber()
  base_fare?: number;

  @IsOptional()
  @IsNumber()
  total_fare?: number;

  @IsNotEmpty()
  @IsNumber()
  ride_km: number;

  @IsNotEmpty()
  @IsNumber()
  ride_timing: number;

  @IsOptional()
  @IsNumber()
  ride_delay_time?: number;

  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => RideRoutingInput)
  routing: RideRoutingInput[];
}

export class UpdateRideBookingDto {
  @IsOptional()
  @IsEnum(RideType)
  type?: RideType;

  @IsOptional()
  @IsEnum(RideStatus)
  ride_status?: RideStatus;

  @IsOptional()
  @IsNumber()
  driver_id?: number;

  @IsOptional()
  @IsNumber()
  discount?: number;

  @IsOptional()
  @IsNumber()
  additional_costs?: number;

  @IsOptional()
  @IsString()
  additional_cost_reason?: string;

  @IsOptional()
  @IsNumber()
  ride_km?: number;

  @IsOptional()
  @IsNumber()
  ride_timing?: number;

  @IsOptional()
  @IsNumber()
  ride_delay_time?: number;

  @IsOptional()
  @IsString()
  cancellation_reason?: string;
}

export class CalculateFareDto {
  @IsNumber()
  ride_km: number;

  @IsNumber()
  ride_timing: number;
}

export class RideRoutingInput {
  @IsNotEmpty()
  @IsEnum(RideLocationType)
  type: RideLocationType;

  @IsNotEmpty()
  @IsNumber()
  @IsLatitude()
  latitude: number;

  @IsNotEmpty()
  @IsNumber()
  @IsLongitude()
  longitude: number;
}

export class AcceptRideDto {
  @IsLatitude()
  latitude: number;

  @IsLongitude()
  longitude: number;

  @IsString()
  @IsNotEmpty()
  address: string;
}

export class CancelRideDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}
