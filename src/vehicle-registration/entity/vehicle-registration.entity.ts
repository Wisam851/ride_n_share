import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
} from 'typeorm';

@Entity('vehicle_registrations')
export class VehicleRegistration {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  vehicleName: string;

  @Column({ nullable: true })
  vehiclemodel: string; // e.g., car, bike, truck

  @Column({ nullable: true })
  registrationNumber: string;

  @Column({ nullable: true })
  color: string;

  @Column({ nullable: true, type: 'text' })
  company: string;

  @Column({ nullable: true })
  image: string;

  @Column({
    type: 'smallint',
    default: 1,
    nullable: false,
    comment: ' 0 = inactive, 1 = active',
  })
  status: number;

  @Column({ type: 'date' })
  created_at: String;

  @Column({ type: 'date' })
  updated_at: String;

  @BeforeInsert()
  setCreateDateParts() {
    const today = new Date();
    const onlyDate = today.toISOString().split('T')[0]; // 'YYYY-MM-DD'
    this.created_at = onlyDate;
    this.updated_at = onlyDate;
  }

  @Column({ nullable: true })
  seats_count: number;
}
