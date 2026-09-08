import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    Unique,
    UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'rates' })
// Bitta bank + valyuta uchun bitta qator. Upsert qo'lda (findOneBy + save)
// qilinadi, shuning uchun parallel yozuvda dublikat paydo bo'lish xavfi bor —
// buni baza darajasida to'sib qo'yamiz.
@Unique('uq_rates_bank_currency', ['bank', 'currency'])
export class Rate {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 3 })
    currency!: string;

    @Column({ type: 'varchar', length: 128 })
    bank!: string;

    @Column({ type: 'numeric', nullable: true })
    sell?: string | null;

    @Column({ type: 'numeric', nullable: true })
    buy?: string | null;

    @CreateDateColumn({
        name: 'created_at',
        type: 'timestamptz',
        nullable: true,
    })
    created_at?: Date;

    @UpdateDateColumn({
        name: 'updated_at',
        type: 'timestamptz',
        nullable: true,
    })
    updated_at?: Date;
}
