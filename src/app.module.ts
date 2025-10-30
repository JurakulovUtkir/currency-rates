import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';
import { TelegrafModule } from 'nestjs-telegraf';
import { session } from 'telegraf';
import { BotModule } from './bot/bot.module';
import { TaskServiceModule } from './task-service/task-service.module';

dotenv.config();

@Module({
    imports: [
        TypeOrmModule.forRoot({
            type: 'postgres',
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT),
            username: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            autoLoadEntities: true,
            synchronize: true,
        }),

        TelegrafModule.forRoot({
            middlewares: [session()],
            botName: 'bot',
            token: process.env.BOT_TOKEN!,
            include: [BotModule], // point to the module with @Update handlers
        }),
        // ServeStaticModule.forRoot({
        //     rootPath: join(__dirname, '..', 'assets'),
        //     serveRoot: '/assets', // exposes /files/photo.png
        // }),
        BotModule,
        // ChannelsModule,
        TaskServiceModule,
        // // update for genix
        // UsersModule,
        // AuthModule,
        // QuestionsModule,
        // QuestionTypesModule,
        // SubjectsModule,
        // FileSystemModule,
    ],
})
export class AppModule {}
