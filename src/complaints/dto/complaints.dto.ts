import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { ComplaintStatus } from '../entity/complaints.entity';
export class CreateComplaintsDto {
    @IsNumber()
    complaint_category_id?: number;
    @IsString()
    complaint_issue?: string;
    @IsString()
    complaint_description?: string;
}

export class UpdateComplaintStatusDto {
  @IsEnum(ComplaintStatus)
  complaint_status: ComplaintStatus;

  @IsOptional()
  @IsString()
  admin_remarks?: string;
}
