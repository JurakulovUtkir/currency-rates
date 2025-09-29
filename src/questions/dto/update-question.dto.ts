import { PartialType } from '@nestjs/mapped-types';
import { CreateQuestionDto } from './create-question.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateQuestionDto extends PartialType(CreateQuestionDto) {
    @ApiPropertyOptional({
        description: 'The name of the question',
        example: 'Basic Algebra Question 1',
    })
    name?: string;

    @ApiPropertyOptional({
        description: 'Detailed description of the question',
        example: 'Solve for x in the equation 2x + 5 = 13',
    })
    description?: string;

    @ApiPropertyOptional({
        description: 'URL to the question file or resources',
        example: 'https://example.com/questions/algebra1.pdf',
    })
    file_url?: string;

    @ApiPropertyOptional({
        description: 'ID of the question type (e.g., multiple choice, essay)',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    question_type_id?: string;

    @ApiPropertyOptional({
        description: 'ID of the subject this question belongs to',
        example: '123e4567-e89b-12d3-a456-426614174001',
    })
    subject_id?: string;

    @ApiPropertyOptional({
        description: 'Difficulty level of the question',
        example: 3,
        minimum: 1,
    })
    level?: number;

    @ApiPropertyOptional({
        description: 'Whether this is a premium question',
        example: false,
        default: false,
    })
    is_premium?: boolean;
}
