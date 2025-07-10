export class CreateComplainCategoryDto {
  name: string;
  icon: string;
}

import { IsOptional, IsString } from 'class-validator';

export class UpdateComplainCategoryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  icon?: string;
}
