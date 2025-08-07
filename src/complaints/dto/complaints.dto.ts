import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsNumber,
} from 'class-validator';
export class CreateComplaintsDto {
    @IsNumber()
    complaint_category_id?: number;
    @IsString()
    complaint_issue?: string;
    @IsString()
    complaint_description?: string;
}

export class UpdateComplaintsDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  icon?: string;
}
