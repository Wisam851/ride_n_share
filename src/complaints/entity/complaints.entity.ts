import { User } from 'src/users/entity/user.entity';
import { Admin } from 'src/admin/entity/admin.entity';
import { RideBooking } from 'src/ride-booking/entity/ride-booking.entity';
import {
  BeforeInsert,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { complaintsCaterory } from 'src/complaints-category/entity/complaints_category.entity';

export enum ComplaintStatus {
  PENDING = 'pending',
  RESPONDED = 'responded',
  RESOLVED = 'resolved',
}

@Entity()
export class complaints {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  complaint_category_id: number;

  @ManyToOne(() => complaintsCaterory, {nullable: true})
  @JoinColumn({ name: 'complaint_category_id' })
  complaintCategory: complaintsCaterory;

  @Column()
  complaint_issue: string;

  @Column()
  complaint_description: string;

  @Column({
    type: 'smallint',
    default: 1,
    nullable: false,
    comment: '0 = inactive, 1 = active',
  })
  status: number;

  @Column({
    type: 'enum',
    enum: ComplaintStatus,
    default: ComplaintStatus.PENDING,
  })
  complaint_status: ComplaintStatus;

  @Column({ type: 'text', nullable: true })
  admin_remarks: string;

  @Column({ type: 'int', nullable: true })
  responded_by?: number;

  @Column({ type: 'date' })
  created_at: string;

  @Column({ type: 'date' })
  updated_at: string;

  @Column({ type: 'int' })
  created_by: number;

  @Column({ type: 'int', nullable: true })
  ride_id: number;

  @ManyToOne(() => RideBooking, { nullable: true })
  @JoinColumn({ name: 'ride_id' })
  ride: RideBooking;

  @BeforeInsert()
  setCreateDateParts() {
    const today = new Date();
    const onlyDate = today.toISOString().split('T')[0]; // 'YYYY-MM-DD'
    this.created_at = onlyDate;
    this.updated_at = onlyDate;
  }

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  user: User;

  @ManyToOne(() => Admin)
  @JoinColumn({ name: 'responded_by' })
  admin: Admin;
}
