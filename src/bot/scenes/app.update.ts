import { Injectable, Logger, UseInterceptors } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { On, Start, Update } from 'nestjs-telegraf';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { Context } from '../context/context';
import { BotInterceptor } from '../interceptor/interceptor';
import { Public } from 'src/auth/decorators/is-public.decorator';

@Update()
@Injectable()
@Public()
@UseInterceptors(BotInterceptor)
export class AppUpdate {
    constructor(
        @InjectRepository(User) private readonly repository: Repository<User>,
    ) {}

    private logger = new Logger(AppUpdate.name);

    @Start()
    async start(ctx: Context) {
        const user = await this.getUser(ctx);
        await ctx.reply(`Welcome ${user.full_name}`);
    }

    async getUser(ctx: Context): Promise<User> {
        {
            const users = await this.repository.find({
                where: {
                    chat_id: ctx.chat.id.toString(),
                },
            });

            if (users.length > 0) {
                return users[0];
            } else {
                try {
                    const user = await this.repository.save({
                        chat_id: ctx.chat.id.toString(),
                        role: 'user',
                        full_name: ctx.from.first_name,
                        status: 'member',
                    });

                    return user;
                } catch (error) {
                    this.logger.error(error.message);
                }
            }
        }
    }

    @On('my_chat_member')
    async get_chat_member(ctx: Context) {
        const newChatMember = ctx.update['my_chat_member'].new_chat_member;
        await this.repository.update(
            {
                chat_id: ctx.chat.id.toString(),
            },
            {
                status: newChatMember.status,
            },
        );
    }
}
