// src/admin-permission/dtos/admin-permission.dto.ts
import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateAdminPermissionDto {
  @IsNotEmpty()
  @IsNumber()
  admin_id: number;

  @IsNotEmpty()
  @IsNumber()
  permission_id: number;
}

export class UpdateAdminPermissionDto {
  @IsOptional()
  @IsNumber()
  admin_id?: number;

  @IsOptional()
  @IsNumber()
  permission_id?: number;
}
