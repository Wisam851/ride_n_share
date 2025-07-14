export class CreateRatingDto {
    userId: number;
    rideId: number;
    remarks: string;
    rating: number;
}

// src/rating/dto/update-rating.dto.ts
import { IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';

export class UpdateRatingDto {
    @IsOptional()
    @IsNumber()
    userId?: number;

    @IsOptional()
    @IsNumber()
    driverId?: number;

    @IsOptional()
    @IsNumber()
    rideId?: number;

    @IsOptional()
    @IsString()
    remarks?: string;

    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(5)
    rating?: number;
}
