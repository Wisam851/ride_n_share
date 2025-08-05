import {
  BadRequestException,
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  VehicleApprovalStatus,
  VehicleRegistration,
} from './entity/vehicle-registration.entity';
import {
  CreateVehicleRegistrationDto,
  ReviewVehicleDto,
  UpdateVehicleRegistrationDto,
} from './dtos/vehicle-registration.dto';
import { UserVehicle } from './entity/user-vehicle.entity';
import { User } from 'src/users/entity/user.entity';
import { VehicleImage } from './entity/vehicle-image.entity';

@Injectable()
export class VehicleRegistrationService {
  constructor(
    @InjectRepository(VehicleRegistration)
    private vehicleRepo: Repository<VehicleRegistration>,

    @InjectRepository(User)
    private userRepo: Repository<User>,

    @InjectRepository(UserVehicle)
    private userVehicleRepo: Repository<UserVehicle>,

    @InjectRepository(VehicleImage)
    private vehicleImageRepo: Repository<VehicleImage>,
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
  async create(
    dto: CreateVehicleRegistrationDto & {
      images: string[];
      vehicle_certificate_back: string;
      vehicle_photo: string;
    },
  ) {
    try {
      const user = await this.userRepo.findOne({ where: { id: dto.userId } });
      if (!user) throw new NotFoundException('Driver not found');

      // Create vehicle with main images
      const vehicle = await this.vehicleRepo.save(
        this.vehicleRepo.create({
          vehicleName: dto.vehicleName,
          vehiclemodel: dto.vehiclemodel,
          registrationNumber: dto.registrationNumber,
          color: dto.color,
          company: dto.company,
          seats_count: dto.seats_count,
          vehicle_certificate_back: dto.vehicle_certificate_back,
          vehicle_photo: dto.vehicle_photo,
        }),
      );

      // Create user-vehicle relationship
      await this.userVehicleRepo.save(
        this.userVehicleRepo.create({
          user,
          vehicle,
        }),
      );

      if (dto.images.length > 0) {
        await this.vehicleImageRepo.save(
          dto.images.map((imagePath) =>
            this.vehicleImageRepo.create({
              imagePath,
              vehicle: { id: vehicle.id },
            }),
          ),
        );
      }

      return {
        success: true,
        message: 'Vehicle registered successfully',
        data: await this.vehicleRepo.findOne({
          where: { id: vehicle.id },
          relations: ['images'],
        }),
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
      const vehicle = await this.vehicleRepo.findOne({
        where: { id },
        relations: ['images'],
      });
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

  async myVehicles(userId: number) {
    try {
      const userVehicles = await this.userVehicleRepo.find({
        where: { user: { id: userId } },
        relations: ['vehicle', 'vehicle.images'],
      });

      const vehicles = userVehicles.map((uv) => uv.vehicle);

      return {
        success: true,
        message: 'User vehicles fetched successfully',
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

      // if (!dto.images) {
      //   dto.images = vehicle.images;
      // }

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

  async reviewVehicle(
    id: number,
    dto: ReviewVehicleDto,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const vehicle = await this.vehicleRepo.findOne({ where: { id } });
      if (!vehicle) throw new NotFoundException('Vehicle not found');

      if (vehicle.approval_status !== VehicleApprovalStatus.PENDING) {
        throw new BadRequestException('Only pending vehicles can be reviewed');
      }

      if (
        dto.status === VehicleApprovalStatus.REJECTED &&
        !dto.rejection_reason
      ) {
        throw new BadRequestException('Rejection reason is required');
      }

      vehicle.approval_status = dto.status as VehicleApprovalStatus;
      vehicle.updated_at = new Date().toISOString().split('T')[0];

      if (dto.status === VehicleApprovalStatus.REJECTED) {
        vehicle.rejection_reason = dto.rejection_reason ?? '';
        vehicle.rejected_at = new Date().toISOString().split('T')[0];
      } else if (dto.status === VehicleApprovalStatus.APPROVED) {
        vehicle.approved_at = new Date().toISOString().split('T')[0];
        vehicle.rejection_reason = '';
      }

      await this.vehicleRepo.save(vehicle);

      return {
        success: true,
        message: `Vehicle ${dto.status.toLowerCase()} successfully`,
      };
    } catch (err) {
      this.handleUnknown(err);
    }
  }

  async findByStatus(status: VehicleApprovalStatus) {
    const list = await this.vehicleRepo.find({
      where: { approval_status: status },
    });

    return {
      success: true,
      message: `${status} vehicles`,
      data: list,
    };
  }
}
