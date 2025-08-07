export class CreateComplaintsDto {
    @IsInt()
    complaint_category_id?: number;
    @IsString()
    complaint_issue?: string;
    @IsString()
    complaint_description?: string;
}

import { IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateComplaintsDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  icon?: string;
}
