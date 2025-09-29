import { Module } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';
import { session } from 'telegraf';
import { AppUpdate } from './scenes/app.update';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';

import { Channel } from 'src/channels/entities/channel.entity';
import { TelegramPost } from 'src/channels/entities/posts.entity';

import * as dotenv from 'dotenv';
dotenv.config();

@Module({
    imports: [
        TelegrafModule.forRoot({
            middlewares: [session()],
            botName: 'bot',
            include: [BotModule],
            token: process.env.BOT_TOKEN,
        }),
        TypeOrmModule.forFeature([User, Channel, TelegramPost]),
    ],
    providers: [AppUpdate],
})
export class BotModule {}
