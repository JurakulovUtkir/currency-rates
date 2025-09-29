import { HttpException, HttpStatus } from '@nestjs/common';

export class LoginOrPasswordWrongException extends HttpException {
    constructor() {
        super('User Login or Password Wrong!', HttpStatus.BAD_REQUEST);
    }
}

export class LoginUserSuchException extends HttpException {
    constructor() {
        super('Such a user not exists!', HttpStatus.BAD_REQUEST);
    }
}

export class RegisterUserAlreadyExistsException extends HttpException {
    constructor() {
        super('Such a user already exists!', HttpStatus.CONFLICT);
    }
}
