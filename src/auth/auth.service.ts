import { HttpStatus, Injectable, NotAcceptableException } from '@nestjs/common';
import { ILoginData, IRegisterData } from './interfaces/auth.service';
import {
    LoginOrPasswordWrongException,
    RegisterUserAlreadyExistsException,
} from './exception/auth.exception';
import { JwtService } from '@nestjs/jwt';
import { LoginDto, RegisterDto } from './dto/create-auth.dto';
import { ResData } from 'src/common/utils/resData';
import { compare, hashed } from 'src/common/utils/bcrypt';

import * as dotenv from 'dotenv';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CheckUserPhoneDto } from './dto/verification.dto';
import { User } from 'src/users/entities/user.entity';
import { UsersService } from 'src/users/users.service';
dotenv.config();

@Injectable()
export class AuthService {
    constructor(
        private readonly userService: UsersService,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        private readonly jwtService: JwtService,
    ) {}

    // Helper methods make_needed_data and transformDataToArrays should be defined appropriately.

    async register(entity: RegisterDto): Promise<ResData<any>> {
        try {
            const data = await this.userService.findOneByPhone(
                entity.phone_number,
            );

            let foundUser = data.data;

            if (!foundUser) {
                // save user to the database
                entity.password = await hashed(entity.password);
                const user = await this.userService.create({
                    phone_number: entity.phone_number,
                    password: entity.password,
                    role: entity.role,
                    full_name: entity.full_name,
                    is_verified: false,
                });
                foundUser = user.data;
            }

            if (foundUser && foundUser.is_verified) {
                throw new RegisterUserAlreadyExistsException();
            }

            //sending verification notification

            return new ResData('User verified', 200, foundUser);
        } catch (error) {
            console.log(error.message);
        }
    }

    async login(dto: LoginDto): Promise<ResData<ILoginData | any>> {
        const { data: foundUser } = await this.userService.findOneByPhone(
            dto.phone_number,
        );

        if (!foundUser) {
            throw new LoginOrPasswordWrongException();
        }

        const checkPassword = await compare(dto.password, foundUser.password);

        if (!checkPassword) {
            throw new LoginOrPasswordWrongException();
        }

        if (!foundUser.is_verified) {
            return new ResData('User not verified', 200, null);
        }

        let token = null;

        if (dto.is_application) {
            token = await this.jwtService.signAsync(
                { id: foundUser.id },
                {
                    secret: process.env.JWT_SECRET,
                    expiresIn: '1y',
                },
            );
        } else {
            token = await this.jwtService.signAsync(
                { id: foundUser.id },
                {
                    secret: process.env.JWT_SECRET,
                    expiresIn: process.env.JWT_EXPIRES_IN,
                },
            );
        }

        return new ResData<ILoginData>('success', HttpStatus.OK, {
            user: foundUser,
            token,
        });
    }

    async check_user(dto: CheckUserPhoneDto) {
        try {
            const user = await this.userRepository.findOneBy({
                phone_number: dto.phone_number,
            });
            return new ResData('User found by phone', 200, user);
        } catch (error) {
            console.log(error.message);
        }
    }
}

export function make_expire_time(date: Date) {
    // have to add 5  minutes to the given date
    const expireTime = new Date(date);
    expireTime.setMinutes(expireTime.getMinutes() + 5);
    return expireTime;
}
