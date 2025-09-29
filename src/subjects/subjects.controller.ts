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
import { SubjectsService } from './subjects.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { Subject } from './entities/subject.entity';

@ApiTags('Subjects')
@Controller('subjects')
export class SubjectsController {
    constructor(private readonly subjectsService: SubjectsService) {}

    @Post()
    @ApiOperation({ summary: 'Create a new subject' })
    @ApiResponse({
        status: 201,
        description: 'The subject has been successfully created.',
        type: Subject,
    })
    @ApiResponse({ status: 400, description: 'Bad Request' })
    create(@Body() createSubjectDto: CreateSubjectDto) {
        return this.subjectsService.create(createSubjectDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all subjects' })
    @ApiResponse({
        status: 200,
        description: 'Return all subjects',
        type: [Subject],
    })
    findAll() {
        return this.subjectsService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a subject by id' })
    @ApiParam({
        name: 'id',
        required: true,
        description: 'Should be an id of a subject that exists in the database',
        type: String,
    })
    @ApiResponse({
        status: 200,
        description: 'The found subject',
        type: Subject,
    })
    @ApiResponse({ status: 404, description: 'Subject not found' })
    findOne(@Param('id') id: string) {
        return this.subjectsService.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a subject by id' })
    @ApiParam({
        name: 'id',
        required: true,
        description: 'Should be an id of a subject that exists in the database',
        type: String,
    })
    @ApiResponse({
        status: 200,
        description: 'The subject has been successfully updated.',
        type: Subject,
    })
    @ApiResponse({ status: 404, description: 'Subject not found' })
    update(
        @Param('id') id: string,
        @Body() updateSubjectDto: UpdateSubjectDto,
    ) {
        return this.subjectsService.update(id, updateSubjectDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a subject by id' })
    @ApiParam({
        name: 'id',
        required: true,
        description: 'Should be an id of a subject that exists in the database',
        type: String,
    })
    @ApiResponse({
        status: 200,
        description: 'The subject has been successfully deleted.',
    })
    @ApiResponse({ status: 404, description: 'Subject not found' })
    remove(@Param('id') id: string) {
        return this.subjectsService.remove(id);
    }
}
