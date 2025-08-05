import {
  IsString,
  IsOptional,
  IsBoolean,
  IsObject,
  IsNotEmpty,
  IsNumber,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class CreateNotificationDto {
  @IsNotEmpty()
  @IsNumber()
  userId: number;

  @IsString()
  title: string;

  @IsString()
  subtitle: string;

  @IsOptional()
  @IsBoolean()
  is_read?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class UpdateNotificationDto extends PartialType(CreateNotificationDto) {}
