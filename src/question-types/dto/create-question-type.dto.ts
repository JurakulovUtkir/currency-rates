import { IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateQuestionTypeDto {
    @ApiProperty({
        description: 'The name of the question type',
        example: 'Multiple Choice',
        type: String,
    })
    @IsString()
    name: string;

    @ApiProperty({
        description: 'Whether the question type is active',
        example: true,
        type: Boolean,
        required: false,
        default: true,
    })
    @IsBoolean()
    @IsOptional()
    is_active?: boolean;
}
