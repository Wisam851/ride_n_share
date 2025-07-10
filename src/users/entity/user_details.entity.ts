import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../entity/user.entity';

@Entity()
export class UserDetails {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  license_no: string;

  @Column()
  license_validity_date: Date;

  @Column()
  identity_no: string;

  @Column()
  identity_validity_date: Date;

  @OneToOne(() => User, (user) => user.details)
  @JoinColumn()
  user: User;
}
