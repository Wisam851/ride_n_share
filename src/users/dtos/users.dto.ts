import { Type } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { IsNull } from 'typeorm';

export class CreateUserDto {
  @IsNotEmpty()
  name: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  password: string;

  @IsNotEmpty()
  phone: string;

  @IsNotEmpty()
  address: string;

  @IsNotEmpty()
  city: string;

  @IsOptional()
  image: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  password?: string;

  @IsOptional()
  phone?: string;

  @IsOptional()
  address?: string;

  @IsOptional()
  city?: string;

  @IsOptional()
  image?: string;

  @IsOptional()
  @Type(() => Number)
  id?: number;
}
