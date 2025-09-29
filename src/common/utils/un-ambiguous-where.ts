export const UnAmbiguousWhere = (ref: string, obj: Record<string, any>) => {
    const newObj = {};

    for (const key in obj) {
        newObj[`${ref}.${key}`] = obj[key];
    }

    return newObj;
};
