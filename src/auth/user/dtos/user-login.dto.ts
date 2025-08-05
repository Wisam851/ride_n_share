import { IsEmail, IsNotEmpty, IsOptional } from 'class-validator';

export class UserLoginDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  password: string;

  @IsOptional()
  fcm_token: string;
}
