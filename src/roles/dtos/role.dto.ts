import { IsNotEmpty, IsOptional } from 'class-validator';

export class CreateRoleDto {
  @IsNotEmpty()
  name: string;

  @IsNotEmpty()
  guard: string;
}

export class UpdateRoleDto {
  @IsOptional()
  name: string;

  @IsOptional()
  guard: string;
}
