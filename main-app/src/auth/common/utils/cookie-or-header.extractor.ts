import { Request } from "express";

export const cookieOrHeaderExtractor = (req: Request): string | null => {
    if (!req) return null;

    if (req.cookies && req.cookies['accessToken']) {
        return req.cookies['accessToken'];
    }

    const authHeader = req.headers['authorization'];

    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.slice(7);
    }

    return null;
};