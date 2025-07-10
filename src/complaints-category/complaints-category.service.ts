import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { complaintsCaterory } from './entity/complaints_category.entity';
import { CreateComplainCategoryDto, UpdateComplainCategoryDto } from './dto/complain-category.dto';




@Injectable()
export class ComplaintsCategoryService {
  constructor(
    @InjectRepository(complaintsCaterory)
    private categoryRepo: Repository<complaintsCaterory>,
  ) {}

  async create(body,userId) {
    try {
        const category = this.categoryRepo.create({
                name : body.name,
                icon : body.icon,
                created_by : userId
        });

        const saved = await this.categoryRepo.save(category);
        return {
            success: true,
            message: 'Complaint category created successfully.',
            data: saved,
        }
    }
    catch (error) {
      throw new InternalServerErrorException({
        success: false,
        message: 'Failed to create complaint category.',
        error: error.message,
      });
    }
  }

  async findAll() {
    try {
      const categories = await this.categoryRepo.find({
        where: { status: 1 }, // Only active
         relations: ['admin'],
      });

      return {
        success: true,
        message: 'Active complaint categories fetched successfully.',
        data: categories,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        success: false,
        message: 'Failed to fetch complaint categories.',
        error: error.message,
      });
    }
  }

  async findOne(id: number) {
    try {
      const category = await this.categoryRepo.findOne({
        where: { id },
        relations: ['admin'],
      });

      if (!category) {
        throw new NotFoundException({
          success: false,
          message: `Complaint category with ID ${id} not found.`,
          data: [],
        });
      }

      return {
        success: true,
        message: `Complaint category with ID ${id} fetched successfully.`,
        data: category,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException({
        success: false,
        message: 'Failed to fetch complaint category.',
        error: error.message,
      });
    }
  }

  async update(id: number, dto: UpdateComplainCategoryDto) {
  try {
    const result = await this.findOne(id);
    const category = result.data;

    
    if (dto.name) {
      category.name = dto.name;
    }
    if (dto.icon) {
      category.icon = dto.icon;
    }

    category.updated_at = new Date().toISOString().split('T')[0];

    const updated = await this.categoryRepo.save(category);

    return {
      success: true,
      message: `Complaint category with ID ${id} updated successfully.`,
      data: updated,
    };
  } catch (error) {
    throw new InternalServerErrorException({
      success: false,
      message: `Failed to update complaint category with ID ${id}.`,
      error: error.message,
    });
  }
}


  async delete(id: number) {
    try {
      const result = await this.findOne(id);
      const category = result.data;

      category.status = category.status === 0 ? 1 : 0;
      category.updated_at = new Date().toISOString().split('T')[0];

      await this.categoryRepo.save(category);
      const messge = category.status === 0 ? "Marked As InActive" : "'Marked As Active";
      return {
        success: true,
        message: messge,
        data: category,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        success: false,
        message: `Failed to delete complaint category with ID ${id}.`,
        error: error.message,
      });
    }
  }
}

