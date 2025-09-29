import { BadRequestException } from '@nestjs/common';

export const getMapParamBool =
    (path: string) =>
    ({ value }) => {
        if (value === 'true') {
            return true;
        } else if (value === 'false') {
            return false;
        } else {
            throw new BadRequestException(
                `${path} must be either true or false`,
            );
        }
    };
