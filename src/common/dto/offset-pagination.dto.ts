import { Transform } from 'class-transformer';
import { IsInt, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OffsetPaginationDto {
    @ApiProperty({
        description: 'The maximum number of items to return',
        example: 10,
        type: Number,
    })
    @Transform(({ value }) => parseInt(value))
    @IsInt()
    limit: number;

    @ApiPropertyOptional({
        description:
            'The number of items to skip before starting to collect the result set',
        example: 0,
        type: Number,
    })
    @Transform(({ value }) => parseInt(value))
    @IsInt()
    @ValidateIf((o) => o.offset !== 0)
    offset: number;
}

export const offsetDefault = new OffsetPaginationDto();
offsetDefault.offset = 0;
offsetDefault.limit = 10;
