import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { RideLocationType } from 'src/common/enums/ride-booking.enum';
import { RideRequest } from './ride_requests.entity';

@Index('idx_ride_request_routing_request_id', ['request_id'])
@Entity('ride_request_routing')
export class RideRequestRouting {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  request_id: number;

  @ManyToOne(() => RideRequest, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'request_id' })
  rideRequest: RideRequest;

  @Column({ type: 'smallint' })
  seq: number; // 0 for pickup, 1 for dropoff, etc.

  @Column({ type: 'enum', enum: RideLocationType })
  type: RideLocationType;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  longitude: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}
