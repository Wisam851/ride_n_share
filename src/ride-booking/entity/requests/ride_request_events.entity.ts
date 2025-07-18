import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  BeforeInsert,
} from 'typeorm';
import { User } from 'src/users/entity/user.entity';
import { RideEventActorType } from 'src/common/enums/ride-booking.enum';
import { RideRequest } from './ride_requests.entity';

@Index('idx_ride_request_events_request_id', ['request_id'])
@Index('idx_ride_request_events_event_type', ['event_type'])
@Entity('ride_request_events')
export class RideRequestEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  request_id: number;

  @ManyToOne(() => RideRequest, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'request_id' })
  rideRequest: RideRequest;

  @Column({ type: 'varchar', length: 100 })
  event_type: string; // e.g., request_created, driver_offered

  @Column({ type: 'enum', enum: RideEventActorType })
  actor_type: RideEventActorType;

  @Column({ nullable: true })
  actor_id: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'actor_id' })
  actor: User;

  @Column({ type: 'jsonb', nullable: true })
  payload_json: Record<string, any>;

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
