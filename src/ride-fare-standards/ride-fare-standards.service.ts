import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RideFareStandard } from './entity/ride-fare-standards.entity';
import {
  CreateRideFareStandardDto,
  UpdateRideFareStandardDto,
} from './dtos/ride-fare-standard.dto';

import { Admin } from 'src/admin/entity/admin.entity';

@Injectable()
export class RideFareStandardsService {
  constructor(
    @InjectRepository(RideFareStandard)
    private readonly fareRepo: Repository<RideFareStandard>,
    @InjectRepository(Admin)
    private readonly adminRepo: Repository<Admin>,
  ) {}

  async create(dto: CreateRideFareStandardDto, created_by: number) {
    try {
      const admin = await this.adminRepo.findOne({ where: { id: created_by } });
      if (!admin) throw new BadRequestException('Invalid admin (created_by)');

      await this.fareRepo
        .createQueryBuilder()
        .update(RideFareStandard)
        .set({ status: 0 })
        .where('status = :status', { status: 1 })
        .execute();

      const record = this.fareRepo.create({
        ...dto,
        created_by: admin,
        status: 1,
      });
      const saved = await this.fareRepo.save(record);
      return {
        success: true,
        message: 'Ride fare standard created successfully',
        data: saved,
      };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  async findAll() {
    try {
      const list = await this.fareRepo.find({order: {id: 'ASC'}});
      return {
        success: true,
        message: 'All ride fare standards fetched',
        data: list,
      };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  async findOne(id: number) {
    try {
      const record = await this.fareRepo.findOne({ where: { id } });
      if (!record) throw new NotFoundException('Ride fare standard not found');
      return {
        success: true,
        message: 'Ride fare standard found',
        data: record,
      };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  async update(id: number, dto: UpdateRideFareStandardDto) {
    try {
      const record = await this.fareRepo.findOne({ where: { id } });
      if (!record) throw new NotFoundException('Ride fare standard not found');

      Object.assign(record, dto);
      record.updated_at = new Date().toISOString().split('T')[0];
      const updated = await this.fareRepo.save(record);

      return {
        success: true,
        message: 'Ride fare standard updated successfully',
        data: updated,
      };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  async toggleStatus(id: number) {
    try {
      const record = await this.fareRepo.findOne({ where: { id } });
      if (!record) throw new NotFoundException('Ride fare standard not found');
      if (record.status === 0) {
        await this.fareRepo
          .createQueryBuilder()
          .update(RideFareStandard)
          .set({ status: 0 })
          .where('status = :status', { status: 1 })
          .execute();
      }

      record.status = record.status === 0 ? 1 : 0;
      await this.fareRepo.save(record);
      return {
        success: true,
        message: `Status ${record.status === 1 ? 'activated' : 'deactivated'}`,
        data: record,
      };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  async remove(id: number) {
    try {
      const record = await this.fareRepo.findOne({ where: { id } });
      if (!record) throw new NotFoundException('Ride fare standard not found');
      await this.fareRepo.remove(record);
      return {
        success: true,
        message: 'Ride fare standard deleted successfully',
        data: null,
      };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  private handleUnknown(err: unknown): never {
    if (err instanceof BadRequestException || err instanceof NotFoundException)
      throw err;
    console.error(err);
    throw new InternalServerErrorException('Unexpected error', {
      cause: err as Error,
    });
  }
}
