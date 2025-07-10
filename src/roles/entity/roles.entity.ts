import { BeforeInsert, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Role {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({})
  name: string;

  @Column({ type: 'varchar', default: 'user' }) // 'admin' or 'user'
  guard: string;
  
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
}
