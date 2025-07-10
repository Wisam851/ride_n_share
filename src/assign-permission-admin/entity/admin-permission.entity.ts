// src/admin-permission/entity/admin-permission.entity.ts
import {
  BeforeInsert,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Admin } from 'src/admin/entity/admin.entity';
import { Permission } from 'src/permissions/entity/permission.entity';

@Entity({ name: 'admin_permissions' })
@Index(['admin_id', 'permission_id'], { unique: true }) 
export class AdminPermission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  admin_id: number;

  @ManyToOne(() => Admin, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'admin_id' })
  admin: Admin;

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
