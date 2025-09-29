import { RoleEnum } from '../../common/types/enums';

export class CreateUserDto {
    phone_number: string;
    password: string;
    role: RoleEnum;
    full_name: string;
    is_verified: boolean;
}
