// vehicle-image.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { VehicleRegistration } from './vehicle-registration.entity';

@Entity()
export class VehicleImage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  imagePath: string;

  @ManyToOne(() => VehicleRegistration, (vehicle) => vehicle.images, {
    onDelete: 'CASCADE',
  })
  vehicle: VehicleRegistration;
}
