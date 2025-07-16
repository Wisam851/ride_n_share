import { User } from "src/users/entity/user.entity";
import { BeforeInsert, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity('user_wallet')
export class UserWallet {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    user_id: number;

    @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column()
    balance: number;

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