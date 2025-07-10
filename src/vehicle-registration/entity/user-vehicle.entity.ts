// src/user-vehicle/user-vehicle.entity.ts
import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { VehicleRegistration } from 'src/vehicle-registration/entity/vehicle-registration.entity';
import { User } from 'src/users/entity/user.entity';

@Entity('user_vehicles')
export class UserVehicle {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => VehicleRegistration, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vehicleId' })
  vehicle: VehicleRegistration;
}
