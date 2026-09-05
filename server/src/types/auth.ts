export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

export type UserPublicProfile = Omit<User, 'password_hash'>;

export interface UserCredentials {
  email: string;
  password: string;
}

export type LoginInput = UserCredentials;

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  iat?: number;
  exp?: number;
}

export interface UserSession {
  userId: string;
  email: string;
  name: string;
  token: string;
  createdAt: string;
}

export interface AuthTokenResponse {
  token: string;
  user: UserPublicProfile;
}
