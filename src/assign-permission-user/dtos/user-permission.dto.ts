// src/user-permission/dtos/user-permission.dto.ts
import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateUserPermissionDto {
  @IsNotEmpty()
  @IsNumber()
  user_id: number;

  @IsNotEmpty()
  @IsNumber()
  permission_id: number;
}

export class UpdateUserPermissionDto {
  @IsOptional()
  @IsNumber()
  user_id?: number;

  @IsOptional()
  @IsNumber()
  permission_id?: number;
}
