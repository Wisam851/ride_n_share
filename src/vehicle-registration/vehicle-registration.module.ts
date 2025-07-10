import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VehicleRegistration } from './entity/vehicle-registration.entity';
import { VehicleRegistrationController } from './vehicle-registration.controller';
import { VehicleRegistrationService } from './vehicle-registration.service';
import { User } from 'src/users/entity/user.entity';
import { UserVehicle } from './entity/user-vehicle.entity';

@Module({
  imports: [TypeOrmModule.forFeature([VehicleRegistration, User, UserVehicle])],
  controllers: [VehicleRegistrationController],
  providers: [VehicleRegistrationService],
  exports: [VehicleRegistrationService],
})
export class VehicleRegistrationModule {}
