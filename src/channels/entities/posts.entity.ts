import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

export class TelegramPost {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'chat_id', type: 'bigint' })
    chat_id: number;

    @Column({ name: 'message_id' })
    message_id: number;

    @Column({ type: 'bigint' })
    date: number;

    @Column({ nullable: true })
    type: string;

    @Column({ nullable: true })
    title: string;

    @Column({ nullable: true })
    username: string;

    @Column({ name: 'is_deleted', default: false })
    is_deleted: boolean;

    @Column({ name: 'is_ad', default: false })
    is_ad: boolean;
}
