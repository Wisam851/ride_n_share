import {
  BadRequestException,
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VehicleRegistration } from './entity/vehicle-registration.entity';
import {
  CreateVehicleRegistrationDto,
  UpdateVehicleRegistrationDto,
} from './dtos/vehicle-registration.dto';
import { UserVehicle } from './entity/user-vehicle.entity';
import { User } from 'src/users/entity/user.entity';

@Injectable()
export class VehicleRegistrationService {
  constructor(
    @InjectRepository(VehicleRegistration)
    private vehicleRepo: Repository<VehicleRegistration>,

    @InjectRepository(User)
    private userRepo: Repository<User>,

    @InjectRepository(UserVehicle)
    private userVehicleRepo: Repository<UserVehicle>,
  ) {}

  private handleUnknown(err: unknown): never {
    if (
      err instanceof NotFoundException ||
      err instanceof BadRequestException
    ) {
      throw err;
    }
    throw new InternalServerErrorException('An unexpected error occurred', {
      cause: err as Error,
    });
  }
  async create(dto: CreateVehicleRegistrationDto) {
    try {
      const user = await this.userRepo.findOne({ where: { id: dto.userId } }); // 🔁 Fix here
      if (!user) throw new NotFoundException('Driver not found');

      const { userId, ...vehicleData } = dto; // 🔁 Fix here

      const vehicle = this.vehicleRepo.create(vehicleData);
      const savedVehicle = await this.vehicleRepo.save(vehicle);

      const userVehicle = this.userVehicleRepo.create({
        user,
        vehicle: savedVehicle,
      });

      await this.userVehicleRepo.save(userVehicle);

      return {
        success: true,
        message: 'Vehicle has been registered successfully',
        data: savedVehicle,
      };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  async toggleStatus(id: number) {
    try {
      const vehicle = await this.vehicleRepo.findOneBy({ id });
      if (!vehicle) {
        throw new NotFoundException(`Vehicle with ID ${id} not found`);
      }

      // Flip status: 1 -> 0, 0 -> 1
      vehicle.status = vehicle.status === 1 ? 0 : 1;
      vehicle.updated_at = new Date().toISOString().split('T')[0];

      const updated = await this.vehicleRepo.save(vehicle);

      return {
        success: true,
        message: `Vehicle has been marked as ${vehicle.status === 1 ? 'active' : 'inactive'}`,
        data: updated,
      };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  async findOne(id: number) {
    try {
      const vehicle = await this.vehicleRepo.findOne({ where: { id } });
      if (!vehicle)
        throw new NotFoundException(`Vehicle with ID ${id} not found`);

      return {
        success: true,
        message: 'Vehicle retrieved successfully',
        data: vehicle,
      };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  async findAll() {
    try {
      const vehicles = await this.vehicleRepo.find();
      return {
        success: true,
        message: 'All vehicles fetched successfully',
        data: vehicles,
      };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  async update(id: number, dto: UpdateVehicleRegistrationDto) {
    try {
      const vehicle = await this.vehicleRepo.findOne({ where: { id } });
      if (!vehicle)
        throw new NotFoundException(`Vehicle with ID ${id} not found`);

      if (!dto.image) {
        dto.image = vehicle.image;
      }

      Object.assign(vehicle, dto);
      const updated = await this.vehicleRepo.save(vehicle);

      return {
        success: true,
        message: 'Vehicle updated successfully',
        data: updated,
      };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  async remove(id: number) {
    try {
      const result = await this.vehicleRepo.delete(id);
      if (result.affected === 0) {
        throw new NotFoundException(`Vehicle with ID ${id} not found`);
      }

      return {
        success: true,
        message: 'Vehicle deleted successfully',
        data: {},
      };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  async softDelete(id: number) {
    try {
      const vehicle = await this.vehicleRepo.findOneBy({ id });
      if (!vehicle) {
        throw new NotFoundException('Vehicle not found');
      }

      vehicle.status = 0; // mark inactive
      vehicle.updated_at = new Date().toISOString().split('T')[0];

      const updated = await this.vehicleRepo.save(vehicle);

      return {
        success: true,
        message: 'Vehicle has been marked as inactive',
        data: updated,
      };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  async findActive() {
    try {
      const vehicles = await this.vehicleRepo.find({ where: { status: 1 } }); // active vehicles

      return {
        success: true,
        message: 'Active vehicles fetched successfully',
        data: vehicles,
      };
    } catch (err) {
      this.handleUnknown(err);
    }
  }
}
