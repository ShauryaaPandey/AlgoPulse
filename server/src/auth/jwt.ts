import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AuthError } from '../utils/errors.js';

export interface TokenPayload {
  userId: string;
  email: string;
}

export function signToken(payload: TokenPayload, expiresIn: string | number = '7d'): string {
  return jwt.sign(
    {
      userId: payload.userId,
      email: payload.email,
    },
    env.JWT_SECRET,
    { expiresIn: expiresIn as jwt.SignOptions['expiresIn'] }
  );
}

export function verifyToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (!decoded || typeof decoded !== 'object' || !('userId' in decoded) || !('email' in decoded)) {
      throw new AuthError('Invalid token payload.');
    }
    return {
      userId: (decoded as TokenPayload).userId,
      email: (decoded as TokenPayload).email,
    };
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }
    throw new AuthError('Session invalid or expired.');
  }
}
