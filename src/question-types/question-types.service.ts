import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuestionType } from './entities/question-type.entity';
import { CreateQuestionTypeDto } from './dto/create-question-type.dto';
import { UpdateQuestionTypeDto } from './dto/update-question-type.dto';
import { ResData } from 'src/common/utils/resData';

@Injectable()
export class QuestionTypesService {
    constructor(
        @InjectRepository(QuestionType)
        private questionTypesRepository: Repository<QuestionType>,
    ) {}

    async create(
        createQuestionTypeDto: CreateQuestionTypeDto,
    ): Promise<ResData<QuestionType | null>> {
        try {
            const questionType = this.questionTypesRepository.create(
                createQuestionTypeDto,
            );
            const data = await this.questionTypesRepository.save(questionType);
            return new ResData('successfully loaded data', 200, data);
        } catch (error) {
            console.log(error);
            return new ResData('failed to load data', error.HttpCode, null);
        }
    }

    async findAll(): Promise<ResData<QuestionType[] | null>> {
        try {
            const data = await this.questionTypesRepository.find();
            return new ResData('successfully loaded data', 200, data);
        } catch (error) {
            console.log(error);
            return new ResData('failed to load data', error.HttpCode, null);
        }
    }

    async findOne(id: string): Promise<ResData<QuestionType | null>> {
        try {
            const questionType = await this.questionTypesRepository.findOne({
                where: { id },
            });
            if (!questionType) {
                return new ResData(
                    `Question type with ID ${id} not found`,
                    404,
                    null,
                );
            }
            return new ResData('successfully loaded data', 200, questionType);
        } catch (error) {
            console.log(error);
            return new ResData('failed to load data', error.HttpCode, null);
        }
    }

    async update(
        id: string,
        updateQuestionTypeDto: UpdateQuestionTypeDto,
    ): Promise<ResData<QuestionType | null>> {
        try {
            const questionType = await this.questionTypesRepository.findOne({
                where: { id },
            });
            if (!questionType) {
                return new ResData(
                    `Question type with ID ${id} not found`,
                    404,
                    null,
                );
            }
            Object.assign(questionType, updateQuestionTypeDto);
            const data = await this.questionTypesRepository.save(questionType);
            return new ResData('successfully updated data', 200, data);
        } catch (error) {
            console.log(error);
            return new ResData('failed to update data', error.HttpCode, null);
        }
    }

    async remove(id: string): Promise<ResData<QuestionType | null>> {
        try {
            const questionType = await this.questionTypesRepository.findOne({
                where: { id },
            });
            if (!questionType) {
                return new ResData(
                    `Question type with ID ${id} not found`,
                    404,
                    null,
                );
            }
            const data = await this.questionTypesRepository.remove(
                questionType,
            );
            return new ResData('successfully deleted data', 200, data);
        } catch (error) {
            console.log(error);
            return new ResData('failed to delete data', error.HttpCode, null);
        }
    }
}
