import { IsNotEmpty, IsOptional } from 'class-validator';

export class CreateAdminDto {
  @IsOptional()
  name: string;

  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  password: string;

  @IsOptional()
  image: string;

  @IsOptional()
  role_id: number;
}
