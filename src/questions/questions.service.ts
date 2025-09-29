import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Question } from './entities/question.entity';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';

@Injectable()
export class QuestionsService {
    constructor(
        @InjectRepository(Question)
        private questionsRepository: Repository<Question>,
    ) {}

    create(createQuestionDto: CreateQuestionDto) {
        const question = this.questionsRepository.create(createQuestionDto);
        return this.questionsRepository.save(question);
    }

    findAll() {
        return this.questionsRepository.find();
    }

    async findOne(id: string) {
        const question = await this.questionsRepository.findOne({
            where: { id },
        });
        if (!question) {
            throw new NotFoundException(`Question with ID ${id} not found`);
        }
        return question;
    }

    async update(id: string, updateQuestionDto: UpdateQuestionDto) {
        const question = await this.findOne(id);
        Object.assign(question, updateQuestionDto);
        return this.questionsRepository.save(question);
    }

    async remove(id: string) {
        const question = await this.findOne(id);
        return this.questionsRepository.remove(question);
    }
}
