import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
} from 'typeorm';
import { Admin } from 'src/admin/entity/admin.entity';

@Entity('ride_fare_standards')
export class RideFareStandard {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('numeric', { comment: 'Price per KM in PKR' })
  price_per_km: number;

  @Column('float', { comment: 'Driver earning percentage' })
  driver_fees: number;

  @Column('float', { comment: 'Surge pricing percentage' })
  sur_charge: number;

  @Column('float', { comment: 'Traffic delay penalty percentage' })
  traffic_delay_charge: number;

  @Column('int', { comment: 'Delay time in minutes before penalty applies' })
  traffic_delay_time: number;

  @Column('numeric', { comment: 'App usage fixed fee' })
  app_fees: number;

  @Column('float', { comment: 'Company revenue percentage' })
  company_fees: number;

  @Column('numeric', { comment: 'Other fixed charges' })
  other_costs: number;

  @Column({ type: 'numeric', nullable: true })
  discount: number;

  @Column({ type: 'numeric', nullable: true })
  additional_cost: number;

  @Column({ type: 'varchar', nullable: true })
  additional_cost_reason: string;

  @Column({ type: 'smallint', default: 1, comment: '1=active, 0=inactive' })
  status: number;

  @ManyToOne(() => Admin, { eager: true })
  @JoinColumn({ name: 'created_by' })
  created_by: Admin;

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
