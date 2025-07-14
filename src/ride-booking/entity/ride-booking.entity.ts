import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
} from 'typeorm';
import { Admin } from 'src/admin/entity/admin.entity';
import { User } from 'src/users/entity/user.entity';
import { RideFareStandard } from 'src/ride-fare-standards/entity/ride-fare-standards.entity';
import { RideStatus, RideType } from 'src/common/enums/ride-booking.enum';

@Entity('ride_bookings')
export class RideBooking {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: RideType, default: RideType.PRIVATE })
  ride_type: RideType;

  @Column({nullable: true})
  customer_id: number;

  @ManyToOne(() => User, {nullable: true})
  @JoinColumn({ name: 'customer_id' })
  customer: User;

  @Column({nullable: true})
  driver_id: number;

  @Column({nullable: true})
  otp_code: string

  @ManyToOne(() => User, {nullable: true})
  @JoinColumn({ name: 'driver_id' })
  driver: User;

  @Column({nullable: true})
  fare_standard_id: number;

  @ManyToOne(() => RideFareStandard, {nullable: true})
  @JoinColumn({ name: 'fare_standard_id' })
  fare_standard: RideFareStandard;

  @Column({ type: 'numeric', nullable: true })
  base_fare: number;

  @Column({ type: 'numeric', nullable: true })
  total_fare: number;

  @Column({ type: 'numeric', nullable: true })
  discount: number;

  @Column({ type: 'numeric', nullable: true })
  additional_cost: number;

  @Column({ type: 'varchar', nullable: true })
  additional_cost_reason: string;

  @Column({ type: 'numeric', nullable: true })
  surcharge_amount: number;

  @Column({ type: 'numeric', nullable: true })
  company_fees_amount: number;

  @Column({ type: 'numeric', nullable: true })
  app_fees_amount: number;

  @Column({ type: 'numeric', nullable: true })
  traffic_delay_amount: number;

  @Column({ type: 'numeric', nullable: true })
  driver_fees_amount: number;

  @Column({ type: 'int', nullable: true })
  ride_timing: number; // in minutes

  @Column({ type: 'int', nullable: true })
  ride_delay_time: number;

  @Column({ type: 'numeric', nullable: true })
  ride_km: number;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Time when ride starts',
  })
  ride_start_time: Date;

  @Column({ type: 'timestamp', nullable: true, comment: 'Time when ride ends' })
  ride_end_time: Date;

  @Column({ type: 'varchar', unique: true })
  ride_no: string;

  @Column({ type: 'enum', enum: RideStatus, default: RideStatus.BOOKED })
  ride_status: RideStatus;

  @Column({ type: 'varchar', nullable: true })
  cancel_reason: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  created_by: number;

  @Column({ type: 'smallint', default: 1 })
  status: number;

  @Column({ type: 'date' })
  created_at: string;

  @Column({ type: 'date' })
  updated_at: string;

  @BeforeInsert()
  setCreateDates() {
    const today = new Date().toISOString().split('T')[0];
    this.created_at = today;
    this.updated_at = today;
  }

  @BeforeInsert()
  generateRideNo() {
    const datePart = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const randomPart = Math.floor(1000 + Math.random() * 9000); // 4-digit random
    this.ride_no = `RIDE-${datePart}-${randomPart}`;
  }
}
