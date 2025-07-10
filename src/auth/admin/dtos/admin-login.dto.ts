import { IsEmail, IsNotEmpty } from 'class-validator';

export class AdminLoginDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  password: string;
}
