import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class VerificationDto {
    @IsString()
    verification_id: string;

    @IsNumber()
    code: number;

    @IsOptional()
    @IsBoolean()
    is_application: boolean;
}

export class CheckUserPhoneDto {
    @ApiProperty({
        description: 'Phone number to verify',
        example: '+1234567890',
    })
    @IsString()
    phone_number: string;
}
