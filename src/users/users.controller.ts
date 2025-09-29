import { Body, Controller, Delete, Get, Param, Patch } from '@nestjs/common';
import { UsersService } from './users.service';
import { OffsetPaginationDto } from 'src/common/dto/offset-pagination.dto';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiParam,
    ApiBody,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @ApiOperation({ summary: 'Get all users with pagination' })
    @ApiBody({ type: OffsetPaginationDto })
    @ApiResponse({
        status: 200,
        description: 'Returns paginated list of users',
    })
    @Get('all')
    async getUsers(@Body() dto: OffsetPaginationDto) {
        return await this.usersService.find_all_pagination(dto);
    }

    @ApiOperation({ summary: 'Get current user profile' })
    @ApiResponse({
        status: 200,
        description: "Returns the current user's profile",
    })
    @Get('me')
    async get_me(@CurrentUser('id') id: string) {
        return await this.usersService.findOneById(id);
    }

    @ApiOperation({ summary: 'Get user by ID' })
    @ApiParam({
        name: 'id',
        description: 'User ID',
        type: String,
    })
    @ApiResponse({
        status: 200,
        description: 'Returns the user profile',
    })
    @ApiResponse({
        status: 404,
        description: 'User not found',
    })
    @Get(':id')
    async get_one(@Param('id') id: string) {
        return await this.usersService.findOneById(id);
    }

    @ApiOperation({ summary: 'Update current user profile' })
    @ApiBody({ type: UpdateUserDto })
    @ApiResponse({
        status: 200,
        description: 'User profile updated successfully',
    })
    @Patch('edit')
    async update_me(
        @CurrentUser('id') id: string,
        @Body() data: UpdateUserDto,
    ) {
        return await this.usersService.update(id, data);
    }

    @ApiOperation({ summary: 'Deactivate current user account' })
    @ApiResponse({
        status: 200,
        description: 'Account deactivated successfully',
    })
    @Delete('delete_account')
    async delete_account(@CurrentUser('id') id: string) {
        return await this.usersService.update(id, { is_verified: false });
    }
}
