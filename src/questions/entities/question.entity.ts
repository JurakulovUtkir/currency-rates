import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('questions')
export class Question {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column()
    description: string;

    @Column()
    file_url: string;

    @Column()
    question_type_id: string;

    @Column()
    subject_id: string;

    @Column()
    level: number;

    @Column({ default: false })
    is_active: boolean;

    @Column({ default: false })
    is_premium: boolean;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
