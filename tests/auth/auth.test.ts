import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, comparePassword } from '../../src/auth/password.js';
import { signToken, verifyToken } from '../../src/auth/jwt.js';
import { authService } from '../../src/auth/auth-service.js';
import { AuthError, ValidationError } from '../../src/utils/errors.js';
import { getDb } from '../../src/db/sqlite.js';
import { runMigrations } from '../../src/db/migrator.js';

describe('Password Hashing & Verification', () => {
  it('hashes and verifies matching password', async () => {
    const raw = 'SuperSecret123!';
    const hash = await hashPassword(raw);

    assert.notEqual(raw, hash);
    assert.ok(hash.startsWith('$2'));

    const isMatch = await comparePassword(raw, hash);
    assert.equal(isMatch, true);
  });

  it('rejects non-matching password', async () => {
    const raw = 'SuperSecret123!';
    const wrong = 'WrongPassword456!';
    const hash = await hashPassword(raw);

    const isMatch = await comparePassword(wrong, hash);
    assert.equal(isMatch, false);
  });
});

describe('JWT Token Sign & Verify', () => {
  it('signs and verifies valid token payload containing only userId and email', () => {
    const payload = { userId: 'user-uuid-1234', email: 'coder@algopulse.io' };
    const token = signToken(payload, '7d');

    assert.ok(typeof token === 'string');
    assert.ok(token.split('.').length === 3);

    const verified = verifyToken(token);
    assert.equal(verified.userId, payload.userId);
    assert.equal(verified.email, payload.email);
  });

  it('rejects expired token', () => {
    const payload = { userId: 'user-uuid-expired', email: 'expired@algopulse.io' };
    const token = signToken(payload, '-1s');

    assert.throws(
      () => {
        verifyToken(token);
      },
      (error: unknown) => {
        return error instanceof AuthError && error.message.includes('Session invalid or expired');
      }
    );
  });

  it('rejects invalid or tampered token', () => {
    assert.throws(
      () => {
        verifyToken('invalid.jwt.token');
      },
      (error: unknown) => {
        return error instanceof AuthError;
      }
    );
  });
});

describe('Unique Email Enforcement', () => {
  it('enforces unique email with friendly validation error', async () => {
    const db = getDb();
    runMigrations(db);

    const testEmail = `test_${Date.now()}@algopulse.io`;
    const res = await authService.signup('Alice Developer', testEmail, 'securePass123');

    assert.ok(res.token);
    assert.equal(res.user.email, testEmail);

    await assert.rejects(
      async () => {
        await authService.signup('Alice Clone', testEmail, 'anotherPass456');
      },
      (error: unknown) => {
        return (
          error instanceof ValidationError &&
          error.message === 'An account with this email already exists. Please log in instead.'
        );
      }
    );

    await assert.rejects(
      async () => {
        await authService.signup('Alice Upper', testEmail.toUpperCase(), 'anotherPass789');
      },
      (error: unknown) => {
        return (
          error instanceof ValidationError &&
          error.message === 'An account with this email already exists. Please log in instead.'
        );
      }
    );
  });
});
