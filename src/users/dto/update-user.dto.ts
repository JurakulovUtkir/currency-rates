import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, IsOptional, IsBoolean } from 'class-validator';

export class UpdateUserDto {
    @ApiProperty({
        type: String,
        example: '+998991853703',
    })
    @IsOptional()
    @IsString()
    @Length(13, 13)
    phone_number?: string;

    @ApiProperty({
        type: String,
        example: 'Mr.Mike',
        description: 'Full name',
    })
    @IsOptional()
    @IsString()
    @Length(3)
    full_name?: string;

    @ApiProperty({
        type: String,
        example: 'Mr.Mike',
        description: 'Full name',
    })
    @IsOptional()
    @IsString()
    @Length(3)
    password?: string;

    @ApiProperty({
        type: Boolean,
        example: true,
        description: 'Is verified status',
    })
    @IsOptional()
    @IsBoolean()
    is_verified?: boolean;
}
