import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'users' })
export class User {
    @PrimaryColumn({ generated: 'uuid' })
    id: string;

    @Column({ type: String })
    full_name: string;

    @Column({ type: String, unique: true, nullable: true })
    chat_id: string;

    @Column({ type: String, unique: true, nullable: true })
    phone_number: string;

    @Column({ type: 'varchar', default: 'web-user' })
    status: string;

    @Column({ nullable: true })
    password: string;

    @Column({ nullable: true, default: 'user' })
    role: string;

    @CreateDateColumn({ nullable: true })
    created_at: Date;

    @Column({ type: Boolean, default: false })
    is_verified: boolean;
}
