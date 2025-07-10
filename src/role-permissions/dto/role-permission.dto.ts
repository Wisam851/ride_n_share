import { IsNotEmpty, IsOptional } from 'class-validator';

export class CreateRolePermissionAssigningDto {
  @IsNotEmpty()
  role_id: number;

  @IsNotEmpty()
  permission_id: number;
}
export class UpdateRolePermissionAssigningDto {
  @IsNotEmpty()
  role_id: number;

  @IsNotEmpty()
  permission_id: number;
}
