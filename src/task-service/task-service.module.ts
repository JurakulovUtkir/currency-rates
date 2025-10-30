import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BotModule } from 'src/bot/bot.module';
import { Channel } from 'src/channels/entities/channel.entity';
import { TelegramPost } from 'src/channels/entities/posts.entity';
import { Rate } from 'src/users/entities/rates.entity';
import { User } from 'src/users/entities/user.entity';
import { TaskServiceService } from './task-service.service';

// tasks/task-service.module.ts  (NO BotModule here, NO forRoot here)
@Module({
    imports: [
        ScheduleModule, // use decorators like @Cron thanks to root forRoot()
        TypeOrmModule.forFeature([Rate]),
    ],
    providers: [TaskServiceService],
    exports: [TaskServiceService],
})
export class TaskServiceModule {}
