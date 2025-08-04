import {
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsString,
  IsArray,
} from 'class-validator';

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
  @IsArray({ each: true })
  images?: string[];

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
  @IsArray()
  images?: string[];

  @IsOptional()
  vehicle_certificate_back: string;

  @IsOptional()
  vehicle_photo: string;

  @IsOptional()
  seats_count: number;
}

export class ReviewVehicleDto {
  @IsEnum(['APPROVED', 'REJECTED'])
  status: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  rejection_reason?: string;
}
