import { LoginUserPayload, UserPayload } from '@application/user/types';
import { Request } from 'express';

declare module 'express' {
  export interface Request {
    userIp?: string;
  }
}
interface RequestWithUser extends Request {
  user: UserPayload;
}

interface LoginRequestUser extends Request {
  user: LoginUserPayload;
}

interface RefreshTokenRequest extends Request {
  refreshToken: string;
  isBrowser: boolean;
  cookies?: { [key: string]: string };
  headers: {
    [key: string]: string | undefined;
  };
}
