
import { Admin } from "src/admin/entity/admin.entity";
import { BeforeInsert, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class complaintsCaterory {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column()
    icon: string;

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

    @Column({ type: 'int' })
    created_by: number;

    @BeforeInsert()
    setCreateDateParts() {
        const today = new Date();
        const onlyDate = today.toISOString().split('T')[0]; // 'YYYY-MM-DD'
        this.created_at = onlyDate;
        this.updated_at = onlyDate;
    }

     @ManyToOne(() => Admin)
     @JoinColumn({ name: 'created_by' })
     admin: Admin

}