import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { RideBooking } from 'src/ride-booking/entity/ride-booking.entity';
import { User } from 'src/users/entity/user.entity';

@Entity('ride_chat_messages')
@Index(['rideId', 'createdAt'])
export class ChatMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'ride_id' })
  rideId: number;

  @ManyToOne(() => RideBooking, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ride_id' })
  ride: RideBooking;

  @Column({ name: 'sender_id' })
  senderId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sender_id' })
  sender: User;

  @Column({ type: 'text' })
  message: string;

  @Column({
    name: 'message_type',
    type: 'enum',
    enum: ['text', 'image', 'location'],
    default: 'text',
  })
  messageType: 'text' | 'image' | 'location';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
