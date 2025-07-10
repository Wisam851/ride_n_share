import { IsNotEmpty, IsOptional } from 'class-validator';

export class CreatePermissionDto {
  @IsNotEmpty()
  module: string;

  @IsNotEmpty()
  action: string;

  @IsNotEmpty()
  name: string;

  @IsNotEmpty()
  guard: string;
}
export class UpdatePermissionDto {
  @IsOptional()
  module: string;

  @IsOptional()
  action: string;

  @IsOptional()
  name: string;

  @IsOptional()
  guard: string;
}
