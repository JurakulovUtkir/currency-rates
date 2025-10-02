import { On, Scene, SceneEnter } from 'nestjs-telegraf';
import { Context } from 'src/bot/context/context';
import { scenes } from 'src/bot/utils/scenes';

@Scene(scenes.PASSWORD)
export class PasswordScene {
    private readonly admin_password = 'admin';

    @SceneEnter()
    async start(ctx: Context) {
        await ctx.reply('Please enter the admin password');
    }

    @On('text')
    async check_password(ctx: Context) {
        try {
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
