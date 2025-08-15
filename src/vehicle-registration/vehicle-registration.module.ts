import { Module, OnApplicationBootstrap } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { VehicleRegistration } from './entity/vehicle-registration.entity';
import { VehicleRegistrationController } from './vehicle-registration.controller';
import { VehicleRegistrationService } from './vehicle-registration.service';
import { User } from 'src/users/entity/user.entity';
import { UserVehicle } from './entity/user-vehicle.entity';
import { VehicleImage } from './entity/vehicle-image.entity';
import { VehicleRegistrationSeederService } from './seeder/vehicle-registration-seeder.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VehicleRegistration,
      User,
      UserVehicle,
      VehicleImage,
    ]),
  ],
  controllers: [VehicleRegistrationController],
  providers: [
    VehicleRegistrationService,
    VehicleRegistrationSeederService, // ← Make sure it's added to providers
  ],
  exports: [VehicleRegistrationService],
})
export class VehicleRegistrationModule implements OnApplicationBootstrap {
  constructor(
    private readonly vehicleSeeder: VehicleRegistrationSeederService, // ← Use the correct name
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.vehicleSeeder.seed(); // ← Call the seeding function on startup
  }
}
