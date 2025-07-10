import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentMethod } from './entity/payment-method.entity';
import {
  CreatePaymentMethodDto,
  UpdatePaymentMethodDto,
} from './dtos/payment-method.dto';

@Injectable()
export class PaymentMethodsService {
  constructor(
    @InjectRepository(PaymentMethod)
    private readonly paymentRepo: Repository<PaymentMethod>,
  ) {}

  async create(dto: CreatePaymentMethodDto, id: number) {
    try {
      const exists = await this.paymentRepo.findOne({
        where: [{ method_name: dto.method_name }, { code: dto.code }],
      });
      if (exists) {
        throw new BadRequestException('Payment method or code already exists');
      }

      const newMethod = this.paymentRepo.create({
        ...dto,
        created_by: id,
      });
      const saved = await this.paymentRepo.save(newMethod);
      return {
        success: true,
        message: 'Payment method created successfully',
        data: saved,
      };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  async findAll() {
    try {
      const list = await this.paymentRepo.find();
      return {
        success: true,
        message: 'All payment methods retrieved successfully',
        data: list,
      };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  async toogleStatus(id: number) {
    try {
      const method = await this.paymentRepo.findOne({ where: { id } });
      if (!method) throw new NotFoundException('Payment method not found');
      method.status = method.status === 0 ? 1 : 0;
      await this.paymentRepo.save(method);
      const message =
        method.status === 0
          ? 'Payment Method is inactive' 
          : 'Payment Method is activated';
      return {
        success: true,
        message: message,
        data: method,
      };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  async findOne(id: number) {
    try {
      const method = await this.paymentRepo.findOne({ where: { id } });
      if (!method) throw new NotFoundException('Payment method not found');
      return {
        success: true,
        message: 'Payment method retrieved successfully',
        data: method,
      };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  async update(id: number, dto: UpdatePaymentMethodDto) {
    try {
      const method = await this.paymentRepo.findOne({ where: { id } });
      if (!method) throw new NotFoundException('Payment method not found');

      if (!dto.image) {
        dto.image = method.image;
      }

      Object.assign(method, dto);
      method.updated_at = new Date().toISOString().split('T')[0];
      const updated = await this.paymentRepo.save(method);

      return {
        success: true,
        message: 'Payment method updated successfully',
        data: updated,
      };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  async remove(id: number) {
    try {
      const method = await this.paymentRepo.findOne({ where: { id } });
      if (!method) throw new NotFoundException('Payment method not found');
      await this.paymentRepo.remove(method);
      return {
        success: true,
        message: 'Payment method deleted successfully',
        data: null,
      };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  private handleUnknown(err: unknown): never {
    if (err instanceof BadRequestException || err instanceof NotFoundException)
      throw err;
    console.log(err);
    throw new InternalServerErrorException('Unexpected error', {
      cause: err as Error,
    });
  }
}
