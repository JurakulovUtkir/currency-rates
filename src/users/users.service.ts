import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { ResData } from 'src/common/utils/resData';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { RegisterDto } from 'src/auth/dto/create-auth.dto';
import { OffsetPaginationDto } from 'src/common/dto/offset-pagination.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { hashed } from 'src/common/utils/bcrypt';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private readonly users_repository: Repository<User>,
    ) {}

    async findOneById(id: string): Promise<ResData<User | undefined>> {
        const foundData = await this.users_repository.findOneBy({ id });

        if (!foundData) {
            throw new NotFoundException();
        }

        return new ResData('get by id', 200, foundData);
    }

    async updateById(
        id: string,
        data: RegisterDto,
    ): Promise<ResData<User | undefined>> {
        const foundData = await this.users_repository.findOneBy({ id: id });

        if (!foundData) {
            throw new NotFoundException();
        }

        await this.users_repository.update(id, {
            phone_number: data.phone_number,
            password: data.password,
            role: data.role,
        });
        const user = await this.users_repository.findOneBy({ id: id });

        return new ResData('get by id', 200, user);
    }

    async update(
        id: string,
        data: UpdateUserDto,
    ): Promise<ResData<User | any>> {
        // Check if the user exists
        const foundData = await this.users_repository.findOneBy({ id });
        if (!foundData) {
            throw new NotFoundException('User not found');
        }

        // Initialize the update data object
        const updateData: Partial<UpdateUserDto> = {};

        // Conditionally add properties if they are present in the DTO
        if (data.phone_number) {
            updateData.phone_number = data.phone_number;
        }
        if (data.full_name) {
            updateData.full_name = data.full_name;
        }
        if (data.password) {
            updateData.password = await hashed(data.password);
        }

        // Perform the update if there is data to update
        if (Object.keys(updateData).length > 0) {
            await this.users_repository.update(id, updateData);
        }

        // Fetch the updated user
        const updatedUser = await this.users_repository.findOneBy({ id });

        // Exclude the password from the response
        const { password, ...response } = updatedUser;

        return new ResData('User updated successfully', 200, response);
    }

    async findOneByPhone(phone: string) {
        const foundData = await this.users_repository.findOneBy({
            phone_number: phone,
        });

        const resData = new ResData('success', 200, foundData);

        if (!foundData) {
            resData.message = 'Not Found';
            resData.statusCode = 404;
        }

        return resData;
    }

    async create(dto: CreateUserDto): Promise<ResData<User>> {
        const newUser = new User();

        const newData = Object.assign(newUser, dto);

        const newUserEntity = await this.users_repository.save(newData);

        return new ResData('success', 200, newUserEntity);
    }

    async find_all_pagination(
        dto: OffsetPaginationDto,
    ): Promise<ResData<User[]>> {
        const newUserEntity = await this.users_repository.find({
            skip: dto.offset,
            take: dto.limit,
            order: {
                id: 'DESC',
            },
        });

        return new ResData('success', 200, newUserEntity);
    }
}
