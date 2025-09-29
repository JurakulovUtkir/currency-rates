import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto/create-auth.dto';
import { Public } from './decorators/is-public.decorator';
import { CheckUserPhoneDto } from './dto/verification.dto';

@ApiTags('auth')
@Public()
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @HttpCode(HttpStatus.OK)
    @Post('login')
    async login(@Body() loginDto: LoginDto) {
        return await this.authService.login(loginDto);
    }

    @HttpCode(HttpStatus.OK)
    @Post('register')
    async register(@Body() registerDto: RegisterDto) {
        return await this.authService.register(registerDto);
    }

    // @HttpCode(HttpStatus.OK)
    // @Put('verify')
    // async verify(@Body() dto: VerificationDto) {
    //     return await this.authService.verify_user(
    //         dto.verification_id,
    //         dto.code,
    //         dto.is_application,
    //     );
    // }

    @HttpCode(HttpStatus.OK)
    @Post('check')
    async check(@Body() dto: CheckUserPhoneDto) {
        return await this.authService.check_user(dto);
    }

    // @HttpCode(HttpStatus.OK)
    // @Post('forgot_password')
    // async forgot_password(@Body() dto: CheckUserPhoneDto) {
    //     return await this.authService.forgot_password(dto);
    // }
}
