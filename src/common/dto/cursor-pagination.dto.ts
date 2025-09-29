import { Transform } from 'class-transformer';
import { IsInt, IsOptional, ValidateIf } from 'class-validator';

export class CursorPaginationDto {
    @ValidateIf((o) => o.after)
    @Transform(({ value }) => parseInt(value))
    @IsOptional()
    @IsInt()
    first?: number;

    @ValidateIf((o) => !o.before)
    @Transform(({ value }) => parseInt(value))
    @IsOptional()
    @IsInt()
    after?: number;

    @ValidateIf((o) => o.before)
    @Transform(({ value }) => parseInt(value))
    @IsOptional()
    @IsInt()
    last?: number;

    @ValidateIf((o) => !o.after)
    @Transform(({ value }) => parseInt(value))
    @IsOptional()
    @IsInt()
    before?: number;
}

export const cursorDefault = new CursorPaginationDto();
cursorDefault.after = 0;
cursorDefault.first = 10;
