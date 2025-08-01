import { IsNotEmpty, IsOptional } from 'class-validator';

export class CreateVehicleRegistrationDto {
  @IsNotEmpty()
  vehicleName: string;

  @IsNotEmpty()
  vehiclemodel: string;

  @IsNotEmpty()
  registrationNumber: string;

  @IsNotEmpty()
  color: string;

  @IsNotEmpty()
  company: string;

  @IsOptional()
  image: string;
  
  @IsOptional()
  vehicle_certificate_back: string;

  @IsOptional()
  vehicle_photo: string;

  @IsNotEmpty()
  userId: number;

  @IsNotEmpty()
  seats_count: number;
}

export class UpdateVehicleRegistrationDto {
  @IsOptional()
  vehicleName: string;

  @IsOptional()
  vehiclemodel: string;

  @IsOptional()
  registrationNumber: string;

  @IsOptional()
  color: string;

  @IsOptional()
  company: string;

  @IsOptional()
  image: string;

  @IsOptional()
  vehicle_certificate_back: string;
  
  @IsOptional()
  vehicle_photo: string;

  @IsOptional()
  seats_count: number;
}
