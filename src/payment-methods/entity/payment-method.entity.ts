// src/payment-methods/entity/payment-method.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  BeforeInsert,
} from 'typeorm';

@Entity('payment_methods')
export class PaymentMethod {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  method_name: string;

  @Column({ unique: true })
  code: string;

  @Column({ nullable: true })
  route: string;

  @Column({ nullable: true })
  image_name: string;

  @Column({ nullable: true })
  image: string;

  @Column({ nullable: true })
  type: string; // online, offline (optional for filtering)

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ type: 'smallint', default: 1, comment: '1=active, 0=inactive' })
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
