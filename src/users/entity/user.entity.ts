import {
  BeforeInsert,
  Column,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserDetails } from './user_details.entity';
import { Exclude } from 'class-transformer';
import { UserRole } from 'src/assig-roles-user/entity/user-role.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false })
  name: string;

  @Column({ unique: true, nullable: false })
  email: string;

  @Column({ nullable: false })
  @Exclude()
  password: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true, type: 'text' })
  address: string;

  @Column({ nullable: true })
  gender: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  street: string;

  @Column({ nullable: true })
  district: string;

  @Column({ nullable: true })
  image: string;

  @Column({
    type: 'smallint',
    default: 1,
    nullable: false,
    comment: '0 = inactive, 1 = active',
  })
  status: number;

  @Column({
    type: 'smallint',
    default: 1,
    nullable: false,
    comment: '0 = not verified, 1 = verified',
  })
  isVarified: number;

  @Column({
    type: 'smallint',
    default: 1,
    nullable: false,
    comment: '1 for online and 0 for offline',
  })
  isOnline: number;

  @Column({ type: 'date' })
  created_at: string;

  @Column({ type: 'date' })
  updated_at: string;

  @BeforeInsert()
  setCreateDateParts() {
    const today = new Date();
    const onlyDate = today.toISOString().split('T')[0]; // 'YYYY-MM-DD'
    this.created_at = onlyDate;
    this.updated_at = onlyDate;
  }
  @OneToOne(() => UserDetails, (userDetails) => userDetails.user)
  details: UserDetails;

  @Column({ nullable: true })
  access_token: string;

  // @OneToMany(() => UserRole, (userRole) => userRole.role)
  // userRoles: UserRole[];

  @OneToMany(() => UserRole, (userRole) => userRole.user)
  userRoles: UserRole[];
}
