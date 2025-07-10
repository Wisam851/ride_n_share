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
import { RideLocationType } from 'src/common/enums/ride-booking.enum';

@Entity('ride_routings')
export class RideRouting {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  ride_id: number;

  @ManyToOne(() => RideBooking, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ride_id' })
  ride: RideBooking;

  @Column('double precision')
  latitude: number;

  @Column('double precision')
  longitude: number;

  @Column({ type: 'enum', enum: RideLocationType })
  type: RideLocationType;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ type: 'smallint', default: 1 })
  status: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  created_by: number;

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
