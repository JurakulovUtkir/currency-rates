import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { QuestionTypesService } from './question-types.service';
import { CreateQuestionTypeDto } from './dto/create-question-type.dto';
import { UpdateQuestionTypeDto } from './dto/update-question-type.dto';
import { QuestionType } from './entities/question-type.entity';

@ApiTags('Question Types')
@Controller('question-types')
export class QuestionTypesController {
    constructor(private readonly questionTypesService: QuestionTypesService) {}

    @Post()
    @ApiOperation({ summary: 'Create a new question type' })
    @ApiResponse({
        status: 201,
        description: 'The question type has been successfully created.',
        type: QuestionType,
    })
    @ApiResponse({ status: 400, description: 'Bad Request' })
    create(@Body() createQuestionTypeDto: CreateQuestionTypeDto) {
        return this.questionTypesService.create(createQuestionTypeDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all question types' })
    @ApiResponse({
        status: 200,
        description: 'Return all question types',
        type: [QuestionType],
    })
    findAll() {
        return this.questionTypesService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a question type by id' })
    @ApiParam({
        name: 'id',
        required: true,
        description:
            'Should be an id of a question type that exists in the database',
        type: String,
    })
    @ApiResponse({
        status: 200,
        description: 'The found question type',
        type: QuestionType,
    })
    @ApiResponse({ status: 404, description: 'Question type not found' })
    findOne(@Param('id') id: string) {
        return this.questionTypesService.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a question type by id' })
    @ApiParam({
        name: 'id',
        required: true,
        description:
            'Should be an id of a question type that exists in the database',
        type: String,
    })
    @ApiResponse({
        status: 200,
        description: 'The question type has been successfully updated.',
        type: QuestionType,
    })
    @ApiResponse({ status: 404, description: 'Question type not found' })
    update(
        @Param('id') id: string,
        @Body() updateQuestionTypeDto: UpdateQuestionTypeDto,
    ) {
        return this.questionTypesService.update(id, updateQuestionTypeDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a question type by id' })
    @ApiParam({
        name: 'id',
        required: true,
        description:
            'Should be an id of a question type that exists in the database',
        type: String,
    })
    @ApiResponse({
        status: 200,
        description: 'The question type has been successfully deleted.',
    })
    @ApiResponse({ status: 404, description: 'Question type not found' })
    remove(@Param('id') id: string) {
        return this.questionTypesService.remove(id);
    }
}
