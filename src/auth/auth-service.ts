import crypto from 'node:crypto';
import { getDb } from '../db/sqlite.js';
import { hashPassword, comparePassword } from './password.js';
import { signToken, verifyToken } from './jwt.js';
import { saveSession, clearSession, getSessionToken } from './session.js';
import type { User, UserPublicProfile } from '../types/auth.js';
import { ValidationError, AuthError } from '../utils/errors.js';

export interface AuthResult {
  user: UserPublicProfile;
  token: string;
}

export class AuthService {
  public async signup(nameInput: string, emailInput: string, passwordInput: string): Promise<AuthResult> {
    const name = nameInput.trim();
    const email = emailInput.trim().toLowerCase();
    const password = passwordInput;

    if (!name) {
      throw new ValidationError('Name is required.');
    }

    if (!email || !email.includes('@')) {
      throw new ValidationError('Please provide a valid email address.');
    }

    if (!password || password.length < 6) {
      throw new ValidationError('Password must be at least 6 characters long.');
    }

    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      throw new ValidationError('An account with this email already exists. Please log in instead.');
    }

    const password_hash = await hashPassword(password);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    try {
      db.prepare(`
        INSERT INTO users (id, name, email, password_hash, created_at, updated_at, last_login_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, name, email, password_hash, now, now, now);
    } catch (error: any) {
      if (error && typeof error === 'object' && error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new ValidationError('An account with this email already exists. Please log in instead.');
      }
      throw error;
    }

    const token = signToken({ userId: id, email });
    saveSession(token, { userId: id, email, name });

    return {
      user: {
        id,
        name,
        email,
        created_at: now,
        updated_at: now,
        last_login_at: now,
      },
      token,
    };
  }

  public async login(emailInput: string, passwordInput: string): Promise<AuthResult> {
    const email = emailInput.trim().toLowerCase();
    const password = passwordInput;

    if (!email || !password) {
      throw new ValidationError('Email and password are required.');
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;

    if (!user) {
      throw new AuthError('Invalid email or password.');
    }

    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      throw new AuthError('Invalid email or password.');
    }

    const now = new Date().toISOString();
    db.prepare('UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?').run(now, now, user.id);

    const token = signToken({ userId: user.id, email: user.email });
    saveSession(token, { userId: user.id, email: user.email, name: user.name });

    const { password_hash, ...publicUser } = user;

    return {
      user: {
        ...publicUser,
        last_login_at: now,
        updated_at: now,
      },
      token,
    };
  }

  public logout(): void {
    clearSession();
  }

  public getCurrentUser(): User | null {
    const token = getSessionToken();
    if (!token) {
      return null;
    }

    try {
      const payload = verifyToken(token);
      const db = getDb();
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.userId) as User | undefined;
      return user ?? null;
    } catch {
      return null;
    }
  }
}

export const authService = new AuthService();
