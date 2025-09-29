import { Injectable, NotFoundException, HttpCode } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subject } from './entities/subject.entity';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { ResData } from 'src/common/utils/resData';

@Injectable()
export class SubjectsService {
    constructor(
        @InjectRepository(Subject)
        private subjectsRepository: Repository<Subject>,
    ) {}

    async create(
        createSubjectDto: CreateSubjectDto,
    ): Promise<ResData<Subject | null>> {
        try {
            const subject = await this.subjectsRepository.create(
                createSubjectDto,
            );
            const data = await this.subjectsRepository.save(subject);
            return new ResData('successfully loaded data', 200, data);
        } catch (error) {
            console.log(error);
            return new ResData('failed to load data', error.HttpCode, null);
        }
    }

    async findAll(): Promise<ResData<Subject[] | null>> {
        try {
            const data = await this.subjectsRepository.find();
            return new ResData('successfully loaded data', 200, data);
        } catch (error) {
            console.log(error);
            return new ResData('failed to load data', error.HttpCode, null);
        }
    }

    async findOne(id: string): Promise<ResData<Subject | null>> {
        try {
            const subject = await this.subjectsRepository.findOne({
                where: { id },
            });
            if (!subject) {
                return new ResData(
                    `Subject with ID ${id} not found`,
                    404,
                    null,
                );
            }
            return new ResData('successfully loaded data', 200, subject);
        } catch (error) {
            console.log(error);
            return new ResData('failed to load data', error.HttpCode, null);
        }
    }

    async update(
        id: string,
        updateSubjectDto: UpdateSubjectDto,
    ): Promise<ResData<Subject | null>> {
        try {
            const subject = await this.subjectsRepository.findOne({
                where: { id },
            });
            if (!subject) {
                return new ResData(
                    `Subject with ID ${id} not found`,
                    404,
                    null,
                );
            }
            Object.assign(subject, updateSubjectDto);
            const data = await this.subjectsRepository.save(subject);
            return new ResData('successfully updated data', 200, data);
        } catch (error) {
            console.log(error);
            return new ResData('failed to update data', error.HttpCode, null);
        }
    }

    async remove(id: string): Promise<ResData<Subject | null>> {
        try {
            const subject = await this.subjectsRepository.findOne({
                where: { id },
            });
            if (!subject) {
                return new ResData(
                    `Subject with ID ${id} not found`,
                    404,
                    null,
                );
            }
            const data = await this.subjectsRepository.remove(subject);
            return new ResData('successfully deleted data', 200, data);
        } catch (error) {
            console.log(error);
            return new ResData(
                'failed to delete data',
                error.HttpCode,
                null,
                error,
            );
        }
    }
}
