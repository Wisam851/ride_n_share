import {
  BeforeInsert,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { RideBooking } from './ride-booking.entity';
import { User } from 'src/users/entity/user.entity';
import { RideStatus } from 'src/common/enums/ride-booking.enum';

@Entity('ride_booking_logs')
export class RideBookingLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  ride_id: number;

  @ManyToOne(() => RideBooking, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ride_id' })
  ride: RideBooking;

  @Column({ type: 'enum', enum: RideStatus })
  status: RideStatus;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'changed_by' })
  changed_by: User;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  changed_at: Date;
}
