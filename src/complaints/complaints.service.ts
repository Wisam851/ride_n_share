import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { complaints } from './entity/complaints.entity';
import {
  CreateComplaintsDto,
  UpdateComplaintsDto,
} from './dto/complaints.dto';

@Injectable()
export class ComplaintsService {
  constructor(
    @InjectRepository(complaints)
    private complaintsRepo: Repository<complaints>,
  ) {}

  async create(body, userId) {
    try {
      const category = this.complaintsRepo.create({
        complaint_category_id: body.complaint_category_id,
        complaint_issue: body.complaint_issue,
        complaint_description: body.complaint_description,
        created_by: userId,
      });

      const saved = await this.complaintsRepo.save(category);
      return {
        success: true,
        message: 'Complaint created successfully.',
        data: saved,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        success: false,
        message: 'Failed to create complaint.',
        error: error.message,
      });
    }
  }

  async findAll() {
    try {
      const complaints = await this.complaintsRepo.find({
        where: { status: 1 }, // Only active
        relations: ['user'],
      });

      return {
        success: true,
        message: 'Active complaint fetched successfully.',
        data: complaints,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        success: false,
        message: 'Failed to fetch complaint.',
        error: error.message,
      });
    }
  }

  async findOne(id: number) {
    try {
      const complaints = await this.complaintsRepo.findOne({
        where: { id },
        relations: ['user'],
      });

      if (!complaints) {
        throw new NotFoundException({
          success: false,
          message: `Complaint with ID ${id} not found.`,
          data: [],
        });
      }

      return {
        success: true,
        message: `Complaint with ID ${id} fetched successfully.`,
        data: complaints,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException({
        success: false,
        message: 'Failed to fetch complaint.',
        error: error.message,
      });
    }
  }

  async delete(id: number) {
    try {
      const result = await this.findOne(id);
      const complaints = result.data;

      complaints.status = complaints.status === 0 ? 1 : 0;
      complaints.updated_at = new Date().toISOString().split('T')[0];

      await this.complaintsRepo.save(complaints);
      const messge =
        complaints.status === 0 ? 'Marked As InActive' : "'Marked As Active";
      return {
        success: true,
        message: messge,
        data: complaints,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        success: false,
        message: `Failed to delete complaint with ID ${id}.`,
        error: error.message,
      });
    }
  }
}
