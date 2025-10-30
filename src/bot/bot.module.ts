import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';

import { AppUpdate } from './scenes/app.update';

import { Channel } from 'src/channels/entities/channel.entity';
import { TelegramPost } from 'src/channels/entities/posts.entity';

import * as dotenv from 'dotenv';
import { Rate } from 'src/users/entities/rates.entity';
import { AdminMenuScene } from './scenes/admin/admin.menu';
import { PasswordScene } from './scenes/admin/password.scene';
import { TaskServiceModule } from 'src/task-service/task-service.module';
import { ScheduleModule } from '@nestjs/schedule';
dotenv.config();

@Module({
    imports: [
        TypeOrmModule.forFeature([User, Channel, TelegramPost, Rate]),
        TaskServiceModule, // use TaskServiceService here
        ScheduleModule.forRoot(),
    ],
    providers: [AppUpdate, PasswordScene, AdminMenuScene],
})
export class BotModule {}
