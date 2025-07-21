import { RideStatus, RideType } from 'src/common/enums/ride-booking.enum';
import { User } from 'src/users/entity/user.entity';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Index('idx_ride_requests_customer_id', ['customer_id'])
@Index('idx_ride_requests_status', ['status'])
@Index('idx_ride_requests_expires_at', ['expires_at'])
@Index('idx_ride_requests_status_expires', ['status', 'expires_at']) // useful for expiry cron
@Entity('ride_request')
export class RideRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  customer_id: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer: User;

  @Column()
  fare_standard_id: number;

  @Column({ type: 'enum', enum: RideType, default: RideType.PRIVATE })
  ride_type: RideType;

  @Column({ nullable: true, type: 'numeric' })
  ride_km: number;

  @Column({ nullable: true, type: 'numeric' })
  ride_timing: number;

  @Column({ type: 'numeric', nullable: true })
  base_fare: number;

  @Column({ type: 'numeric', nullable: true })
  total_fare: number;

  @Column({ type: 'enum', enum: RideStatus, default: RideStatus.REQUESTED })
  status: RideStatus;

  @Column({ type: 'timestamp' })
  expires_at: Date;

  @Column({ nullable: true })
  confirmed_driver_id: number;

  @Column({ nullable: true })
  confirmed_booking_id: number;

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
}
