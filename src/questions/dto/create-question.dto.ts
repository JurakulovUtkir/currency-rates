import { IsString, IsNumber, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateQuestionDto {
    @ApiProperty({
        description: 'The name of the question',
        example: 'Basic Algebra Question 1',
        type: String,
    })
    @IsString()
    name: string;

    @ApiProperty({
        description: 'Detailed description of the question',
        example: 'Solve for x in the equation 2x + 5 = 13',
        type: String,
    })
    @IsString()
    description: string;

    @ApiProperty({
        description: 'URL to the question file or resources',
        example: 'https://example.com/questions/algebra1.pdf',
        type: String,
    })
    @IsString()
    file_url: string;

    @ApiProperty({
        description: 'ID of the question type (e.g., multiple choice, essay)',
        example: '123e4567-e89b-12d3-a456-426614174000',
        type: String,
    })
    @IsString()
    question_type_id: string;

    @ApiProperty({
        description: 'ID of the subject this question belongs to',
        example: '123e4567-e89b-12d3-a456-426614174001',
        type: String,
    })
    @IsString()
    subject_id: string;

    @ApiProperty({
        description: 'Difficulty level of the question',
        example: 3,
        type: Number,
        minimum: 1,
    })
    @IsNumber()
    level: number;

    @ApiProperty({
        description: 'Whether this is a premium question',
        example: false,
        type: Boolean,
        required: false,
        default: false,
    })
    @IsBoolean()
    @IsOptional()
    is_premium?: boolean;
}
