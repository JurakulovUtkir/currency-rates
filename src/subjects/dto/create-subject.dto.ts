import { IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSubjectDto {
    @ApiProperty({
        description: 'The name of the subject',
        example: 'Mathematics',
        type: String,
    })
    @IsString()
    name: string;

    @ApiProperty({
        description: 'Whether the subject is active',
        example: true,
        type: Boolean,
        required: false,
        default: true,
    })
    @IsBoolean()
    @IsOptional()
    is_active?: boolean;
}
