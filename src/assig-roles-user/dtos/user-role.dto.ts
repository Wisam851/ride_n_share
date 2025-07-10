import { IsNotEmpty, IsOptional } from 'class-validator';

export class CreateUserRoleDto {
  @IsNotEmpty()
  user_id: number;

  @IsNotEmpty()
  role_id: number;
}

export class UpdateUserRoleDto {
  @IsOptional()
  user_id: number;

  @IsOptional()
  role_id: number;
}
