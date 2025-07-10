import { User } from 'src/users/entity/user.entity';
import {
    BeforeInsert,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'saved_places' })
export class SavedPlace {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  name: string;

  @Column()
  longitude: string;

  @Column()
  latitude: string;

  @Column()
  address: string;

  @Column({
    type: 'smallint',
    nullable: false,
    default: 1,
    comment: '1 = Active, 0 = InActive',
  })
  status: number;

  @Column()
  created_by: number;

  @Column({ type: 'date' })
  created_at: string;

  @Column({ type: 'date' })
  updated_at: string;

  @BeforeInsert()
  setCreateDateParts() {
    const today = new Date();
    const onlyDate = today.toISOString().split('T')[0];
    this.created_at = onlyDate;
    this.updated_at = onlyDate;
  }
}
