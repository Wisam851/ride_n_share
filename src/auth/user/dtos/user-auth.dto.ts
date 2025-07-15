import { IsEmail, IsNotEmpty, IsOptional } from 'class-validator';
import { Match } from 'src/common/decorators/match.decorator';

export class UserLoginDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  password: string;
}

export class UserRegisterDto {
  @IsNotEmpty()
  name: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  phone: string;

  @IsNotEmpty()
  gender: string;

  @IsNotEmpty()
  password: string;

  @IsNotEmpty()
  @Match('password', { message: 'Passwords does not match' })
  confirm_password: string;

  @IsNotEmpty()
  role: string;
}

export class UpdateProfileDto {
  @IsOptional()
  name: string;

  @IsOptional()
  phone: string;

  @IsOptional()
  address: string;

  @IsOptional()
  street: string;

  @IsOptional()
  district: string;

  @IsOptional()
  gender: string;

  @IsOptional()
  city: string;

  @IsOptional()
  image: string;
}
