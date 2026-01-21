import { User, UserRole } from '../entities/user.entity';

export interface CreateUserResponse {
  user: User;
  token: string;
}

export interface UserPayload {
  id: number;
  role: UserRole;
  profileId: number;
}

export interface LoginUserPayload {
  id: number;
  email: string;
  profile: {
    firstName: string;
    lastName: string;
    avatarUrl: string;
  };
}
