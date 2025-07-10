import { Role } from 'src/roles/entity/roles.entity';
import {
  BeforeInsert,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class Admin {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  name: string;

  @Column()
  email: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  image: string;

  @Column({
    type: 'smallint',
    default: 1,
    comment: '1= active and 0 = inactive',
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
  @Column({ nullable: true })
  access_token: string;
}
