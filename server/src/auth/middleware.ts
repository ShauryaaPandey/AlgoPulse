import { getSessionToken, clearSession } from './session.js';
import { verifyToken } from './jwt.js';
import { getDb } from '../db/sqlite.js';
import type { User } from '../types/auth.js';

function fail(): never {
  clearSession();
  console.error('✗ Session expired.\nPlease login again:\nalgopulse login');
  process.exit(1);
}

export function requireAuth(): User {
  const token = getSessionToken();
  if (!token) {
    fail();
  }

  try {
    const payload = verifyToken(token);
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.userId) as User | undefined;
    if (!user) {
      fail();
    }
    return user;
  } catch {
    fail();
  }
}
