import { ApiProperty } from '@nestjs/swagger';
import {
    IsBoolean,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    Length,
} from 'class-validator';
import { RoleEnum } from 'src/common/types/enums';

export class RegisterDto {
    @ApiProperty({
        type: String,
        example: '+998991853703',
    })
    @IsString()
    @Length(13, 13)
    @IsNotEmpty()
    phone_number: string;

    @ApiProperty({
        type: String,
        example: 'Mr.Mike',
        description: 'Full name',
    })
    @IsString()
    @IsNotEmpty()
    full_name: string;

    @ApiProperty({
        type: String,
        example: '123456',
    })
    @IsString()
    @IsNotEmpty()
    password: string;

    @ApiProperty({
        enum: RoleEnum,
        example: RoleEnum.USER,
    })
    @IsEnum(RoleEnum)
    @IsNotEmpty()
    role: RoleEnum;
}

export class LoginDto {
    @ApiProperty({
        type: String,
        example: '+998991853703',
    })
    @IsString()
    @Length(13, 13)
    @IsNotEmpty()
    phone_number: string;

    @ApiProperty({
        type: String,
        example: '123456',
    })
    @IsString()
    @IsNotEmpty()
    password: string;

    @ApiProperty({
        type: Boolean,
        example: true,
    })
    @IsOptional()
    @IsBoolean()
    is_application: boolean;
}
