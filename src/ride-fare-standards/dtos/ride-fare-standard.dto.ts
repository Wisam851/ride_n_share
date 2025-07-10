import { IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateRideFareStandardDto {
  @IsNotEmpty()
  @IsNumber()
  price_per_km: number;

  @IsNotEmpty()
  @IsNumber()
  driver_fees: number;

  @IsNotEmpty()
  @IsNumber()
  sur_charge: number;

  @IsNotEmpty()
  @IsNumber()
  traffic_delay_charge: number;
  @IsNotEmpty()
  @IsNumber()
  traffic_delay_time: number;

  @IsNotEmpty()
  @IsNumber()
  app_fees: number;

  @IsNotEmpty()
  @IsNumber()
  company_fees: number;

  @IsNotEmpty()
  @IsNumber()
  other_costs: number;
}

export class UpdateRideFareStandardDto {
  @IsOptional()
  @IsNumber()
  price_per_km?: number;

  @IsOptional()
  @IsNumber()
  driver_fees?: number;

  @IsOptional()
  @IsNumber()
  sur_charge?: number;
  @IsOptional()
  @IsNumber()
  traffic_delay_charge?: number;

  @IsOptional()
  @IsNumber()
  traffic_delay_time?: number;

  @IsOptional()
  @IsNumber()
  app_fees?: number;

  @IsOptional()
  @IsNumber()
  company_fees?: number;

  @IsOptional()
  @IsNumber()
  other_costs?: number;
}
