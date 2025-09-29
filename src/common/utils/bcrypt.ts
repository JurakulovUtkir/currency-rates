import * as heshla from 'bcrypt';

export const hashed = (data: string): Promise<string> => {
    return heshla.hash(data, 10);
};

export const compare = (data: string, hashData: string): Promise<boolean> => {
    return heshla.compare(data, hashData);
};
