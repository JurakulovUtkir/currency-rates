import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegrafModule } from 'nestjs-telegraf';
import { User } from 'src/users/entities/user.entity';
import { session } from 'telegraf';
import { AppUpdate } from './scenes/app.update';

import { Channel } from 'src/channels/entities/channel.entity';
import { TelegramPost } from 'src/channels/entities/posts.entity';

import * as dotenv from 'dotenv';
import { Rate } from 'src/users/entities/rates.entity';
import { AdminMenuScene } from './scenes/admin/admin.menu';
import { PasswordScene } from './scenes/admin/password.scene';
dotenv.config();

@Module({
    imports: [
        TelegrafModule.forRoot({
            middlewares: [session()],
            botName: 'bot',
            include: [BotModule],
            token: process.env.BOT_TOKEN,
        }),
        TypeOrmModule.forFeature([User, Channel, TelegramPost, Rate]),
    ],
    providers: [AppUpdate, PasswordScene, AdminMenuScene],
})
export class BotModule {}
