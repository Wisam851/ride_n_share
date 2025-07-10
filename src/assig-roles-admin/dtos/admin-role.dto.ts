import { IsNotEmpty, IsOptional } from 'class-validator';

export class CreateAdminRoleDto {
  @IsNotEmpty()
  admin_id: number;

  @IsNotEmpty()
  role_id: number;
}

export class UpdateAdminRoleDto {
  @IsOptional()
  admin_id: number;

  @IsOptional()
  role_id: number;
}
