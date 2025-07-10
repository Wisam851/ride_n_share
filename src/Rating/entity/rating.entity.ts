// src/rating/entities/rating.entity.ts

import { User } from 'src/users/entity/user.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, BeforeInsert } from 'typeorm';

@Entity()
export class Rating {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  driverId: number; // No relation yet

  @Column()
  rideId: number; // No relation yet

  @Column()
  remarks: string;

  @Column('float')
  rating: number;
  @Column()
  user_id: number;
  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
  @Column({
    type: 'smallint',
    default: 1,
    nullable: false,
    comment: '0 = inactive, 1 = active',
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
}
