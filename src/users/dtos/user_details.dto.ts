import { IsNotEmpty } from 'class-validator';

export class UserDetailsDto {
  @IsNotEmpty()
  license_no: string;

  @IsNotEmpty()
  license_validity_date: Date;

  @IsNotEmpty()
  identity_no: string;

  @IsNotEmpty()
  identity_validity_date: Date;
}
