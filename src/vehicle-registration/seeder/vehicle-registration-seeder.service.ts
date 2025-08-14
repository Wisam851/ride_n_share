import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from 'src/users/entity/user.entity';
import { UserVehicle } from '../entity/user-vehicle.entity';
import { VehicleImage } from '../entity/vehicle-image.entity';
import { VehicleRegistration } from '../entity/vehicle-registration.entity';

@Injectable()
export class VehicleRegistrationSeederService {
    private readonly logger = new Logger(VehicleRegistrationSeederService.name);

    constructor(
        @InjectRepository(VehicleRegistration)
        private readonly vehicleRepo: Repository<VehicleRegistration>,

        @InjectRepository(VehicleImage)
        private readonly vehicleImageRepo: Repository<VehicleImage>,

        @InjectRepository(UserVehicle)
        private readonly userVehicleRepo: Repository<UserVehicle>,

        @InjectRepository(User)
        private readonly userRepo: Repository<User>, 
    ) { }

    async seed(): Promise<void> {
        const driver = await this.userRepo.findOne({ where: { email: 'driver@gmail.com' } });

        if (!driver) {
            this.logger.warn('Driver not found. Please seed the driver user first.');
            return;
        }

        const existingVehicle = await this.userVehicleRepo.findOne({
            where: { user: { id: driver.id } },
            relations: ['vehicle'],
        });

        if (existingVehicle) {
            this.logger.log('Dummy vehicle already registered for driver.');
            return;
        }

        const dummyVehicleData = {
            vehicleName: 'SEED Vehicle',
            vehiclemodel: 'Model X',
            registrationNumber: 'SEED-1234',
            color: 'Black',
            company: 'Seed Motors',
            seats_count: 4,
            vehicle_certificate_back: 'seed_certificate_back.jpg',
            vehicle_photo: 'seed_vehicle_photo.jpg',
            images: ['seed_img1.jpg', 'seed_img2.jpg'],
        };

        const vehicle = await this.vehicleRepo.save(
            this.vehicleRepo.create({
                vehicleName: dummyVehicleData.vehicleName,
                vehiclemodel: dummyVehicleData.vehiclemodel,
                registrationNumber: dummyVehicleData.registrationNumber,
                color: dummyVehicleData.color,
                company: dummyVehicleData.company,
                seats_count: dummyVehicleData.seats_count,
                vehicle_certificate_back: dummyVehicleData.vehicle_certificate_back,
                vehicle_photo: dummyVehicleData.vehicle_photo,
            }),
        );

        await this.userVehicleRepo.save(
            this.userVehicleRepo.create({
                user: driver,
                vehicle,
            }),
        );

        await this.vehicleImageRepo.save(
            dummyVehicleData.images.map((imagePath) =>
                this.vehicleImageRepo.create({
                    imagePath,
                    vehicle: { id: vehicle.id },
                }),
            ),
        );

        this.logger.log('Dummy vehicle registration completed.');
    }
}
