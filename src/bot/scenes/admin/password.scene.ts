import { Logger } from '@nestjs/common';
import { On, Scene, SceneEnter, Start } from 'nestjs-telegraf';
import { Context } from 'src/bot/context/context';
import { scenes } from 'src/bot/utils/scenes';

@Scene(scenes.PASSWORD)
export class PasswordScene {
    private readonly logger = new Logger(PasswordScene.name);

    // Parol .env dagi ADMIN_PASSWORD dan olinadi. Sozlanmagan bo'lsa hech kim
    // kira olmaydi — ilgari kodda ochiq `'admin'` turardi.
    private readonly admin_password = process.env.ADMIN_PASSWORD;

    @SceneEnter()
    async start(ctx: Context) {
        await ctx.reply('Please enter the admin password');
    }

    @Start()
    async start_button(ctx: Context) {
        // const user = await this.getUser(ctx);
        // await ctx.reply(`Welcome ${user.full_name}`);

        // going to password scene
        await ctx.scene.enter(scenes.PASSWORD);
    }

    @On('text')
    async check_password(ctx: Context) {
        try {
            if (!this.admin_password) {
                this.logger.error(
                    'ADMIN_PASSWORD .env da sozlanmagan — admin panelga kirish yopiq.',
                );
                await ctx.reply('Admin paroli sozlanmagan. Adminga murojaat qiling.');
                return;
            }

            const text_password = ctx.message['text'];
            if (text_password == this.admin_password) {
                await ctx.scene.enter(scenes.ADMIN_MENU);
            } else {
                await ctx.reply(
                    'Your code is wrong it seems you are not a admin',
                );
                await ctx.scene.reenter();
            }
        } catch (error) {
            console.log('something go wrong : ' + error);
        }
    }
}
