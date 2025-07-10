import { IsNotEmpty, IsOptional } from 'class-validator';

export class CreatePaymentMethodDto {
  @IsNotEmpty()
  method_name: string;

  @IsNotEmpty()
  code: string;

  @IsOptional()
  route?: string;

  @IsOptional()
  image_name?: string;

  @IsOptional()
  image?: string;

  @IsOptional()
  type?: string;

  @IsOptional()
  description?: string;
}

export class UpdatePaymentMethodDto {
  @IsOptional()
  method_name?: string;

  @IsOptional()
  code?: string;

  @IsOptional()
  route?: string;

  @IsOptional()
  image_name?: string;

  @IsOptional()
  image?: string;

  @IsOptional()
  type?: string;

  @IsOptional()
  description?: string;
}
