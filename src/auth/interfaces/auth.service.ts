import { User } from '../../users/entities/user.entity';

export interface ILoginData {
    user: User;
    token: string;
}

export interface IRegisterData {
    user: User;
    token: string;
}
