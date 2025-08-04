import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  BeforeInsert,
  OneToMany,
} from 'typeorm';
import { VehicleImage } from './vehicle-image.entity';

export enum VehicleApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('vehicle_registrations')
export class VehicleRegistration {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  vehicleName: string;

  @Column({ nullable: true })
  vehiclemodel: string; // car, bike, etc.

  @Column({ nullable: true })
  registrationNumber: string;

  @Column({ nullable: true })
  color: string;

  @Column({ type: 'text', nullable: true })
  company: string;

  @Column({ type: 'varchar', nullable: true })
  vehicle_certificate_back: string;

  @Column({ type: 'varchar', nullable: true })
  vehicle_photo: string;

  @Column({ type: 'int', nullable: true })
  seats_count: number;

  // Status toggle (1 = active, 0 = inactive)
  @Column({
    type: 'smallint',
    default: 1,
    comment: '0 = inactive, 1 = active',
  })
  status: number;

  // Approval workflow status
  @Column({
    type: 'enum',
    enum: VehicleApprovalStatus,
    default: VehicleApprovalStatus.PENDING,
  })
  approval_status: VehicleApprovalStatus;

  @Column({ type: 'varchar', nullable: true })
  rejection_reason: string;

  @Column({ type: 'date', nullable: true })
  approved_at: string;

  @Column({ type: 'date', nullable: true })
  rejected_at: string;

  @Column({ type: 'date' })
  created_at: string;

  @Column({ type: 'date' })
  updated_at: string;

  @OneToMany(() => VehicleImage, (image) => image.vehicle)
  images: VehicleImage[];

  @BeforeInsert()
  setCreateDateParts() {
    const today = new Date().toISOString().split('T')[0];
    this.created_at = today;
    this.updated_at = today;
  }
}
