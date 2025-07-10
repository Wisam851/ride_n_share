import { Permission } from 'src/permissions/entity/permission.entity';
import { Role } from 'src/roles/entity/roles.entity';
import {
  BeforeInsert,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'role_permissions' })
export class RolePermissions {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  role_id: number;

  @ManyToOne(() => Role, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @Column()
  permission_id: number;

  @ManyToOne(() => Permission, { eager: true, onDelete: 'CASCADE' })
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
