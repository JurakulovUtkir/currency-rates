import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './guards/jwt-auth-guard';

import { JwtStrategy } from './strategy/jwt.strategy';

import { ConfigService } from '@nestjs/config';

import { HttpModule } from '@nestjs/axios';
import * as dotenv from 'dotenv';
import { User } from 'src/users/entities/user.entity';
import { UsersService } from 'src/users/users.service';
dotenv.config();

@Module({
    imports: [
        TypeOrmModule.forFeature([User]),
        JwtModule.register({
            secret: process.env.JWT_SECRET,
            signOptions: { expiresIn: process.env.JWT_EXPIRES_IN },
        }),
        HttpModule,
    ],
    controllers: [AuthController],
    providers: [
        ConfigService,
        AuthService,
        JwtService,
        JwtStrategy,
        UsersService,
        {
            provide: APP_GUARD,
            useClass: JwtAuthGuard,
        },
    ],
    exports: [JwtService],
})
export class AuthModule {}
