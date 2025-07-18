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
import { RideRequest } from './ride_requests.entity';
import { RideDriverOfferStatus } from 'src/common/enums/ride-booking.enum';

@Index('idx_ride_driver_offers_request_id', ['request_id'])
@Index('idx_ride_driver_offers_req_driver', ['request_id', 'driver_id'], {
  unique: true,
})
@Entity('ride_driver_offers')
export class RideDriverOffer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  request_id: number;

  @ManyToOne(() => RideRequest, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'request_id' })
  rideRequest: RideRequest;

  @Column()
  driver_id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'driver_id' })
  driver: User;

  @CreateDateColumn({ type: 'timestamp' })
  offered_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  expires_at: Date;

  @Column({
    type: 'enum',
    enum: RideDriverOfferStatus,
    default: RideDriverOfferStatus.ACTIVE,
  })
  status: RideDriverOfferStatus;

  @Column({ type: 'jsonb', nullable: true })
  meta_json: Record<string, any> | null; // e.g., { eta: 5, vehicle: 'Toyota Prius' }

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
