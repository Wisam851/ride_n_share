import { User } from 'src/users/entity/user.entity';
import {
  BeforeInsert,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class complaints {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  complaint_category_id: string;

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

  @Column({ type: 'date' })
  created_at: string;

  @Column({ type: 'date' })
  updated_at: string;

  @Column({ type: 'int' })
  created_by: number;

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
}
