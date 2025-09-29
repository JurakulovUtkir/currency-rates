import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionTypesService } from './question-types.service';
import { QuestionTypesController } from './question-types.controller';
import { QuestionType } from './entities/question-type.entity';

@Module({
    imports: [TypeOrmModule.forFeature([QuestionType])],
    controllers: [QuestionTypesController],
    providers: [QuestionTypesService],
    exports: [QuestionTypesService],
})
export class QuestionTypesModule {}
