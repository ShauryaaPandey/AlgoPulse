import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../auth/jwt.js';
import { getDb } from '../db/sqlite.js';
import type { User } from '../types/auth.js';

export interface AuthRequest extends Request {
  userId?: string;
  user?: User;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    const token = req.cookies['algopulse_token'] || 
                  req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({
        error: {
          code: 'SESSION_EXPIRED',
          message: 'Authentication required. Please log in.'
        }
      });
      return;
    }

    const payload = verifyToken(token);
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.userId) as User | undefined;

    if (!user) {
      res.status(401).json({
        error: {
          code: 'SESSION_EXPIRED',
          message: 'User not found. Please log in again.'
        }
      });
      return;
    }

    req.userId = user.id;
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({
      error: {
        code: 'SESSION_EXPIRED',
        message: 'Invalid or expired session. Please log in again.'
      }
    });
  }
}
