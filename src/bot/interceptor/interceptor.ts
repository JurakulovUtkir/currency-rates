import {
    CallHandler,
    ExecutionContext,
    Injectable,
    Logger,
    NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class BotInterceptor implements NestInterceptor {
    private logger = new Logger(BotInterceptor.name);

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const start = Date.now();
        return next
            .handle()
            .pipe(
                tap(() =>
                    this.logger.log(`Response time: ${Date.now() - start}ms`),
                ),
            );
    }
}
