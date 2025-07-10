// src/user-permission/entity/user-permission.entity.ts
import {
  BeforeInsert,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from 'src/users/entity/user.entity';
import { Permission } from 'src/permissions/entity/permission.entity';

@Entity({ name: 'user_permissions' })
@Index(['user_id', 'permission_id'], { unique: true })
export class UserPermission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  permission_id: number;

  @ManyToOne(() => Permission, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'permission_id' })
  permission: Permission;

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

  @BeforeInsert()
  setCreateDateParts() {
    const today = new Date().toISOString().split('T')[0];
    this.created_at = today;
    this.updated_at = today;
  }
}
