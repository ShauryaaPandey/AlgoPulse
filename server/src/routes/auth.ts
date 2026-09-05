import { Router } from 'express';
import { z } from 'zod';
import { authService } from '../auth/auth-service.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { getDb } from '../db/sqlite.js';
import type { PlatformAccount } from '../types/platform.js';
import { env } from '../config/env.js';

const router = Router();

const signupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

router.post('/signup', async (req, res) => {
  const validation = signupSchema.safeParse(req.body);

  if (!validation.success) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: validation.error.format()
      }
    });
    return;
  }

  const { name, email, password } = validation.data;
  const result = await authService.signup(name, email, password);

  const isProduction = env.NODE_ENV === 'production';

  res.cookie('algopulse_token', result.token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.status(201).json({
    user: {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      created_at: result.user.created_at
    }
  });
});

router.post('/login', async (req, res) => {
  const validation = loginSchema.safeParse(req.body);

  if (!validation.success) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: validation.error.format()
      }
    });
    return;
  }

  const { email, password } = validation.data;
  const result = await authService.login(email, password);

  const isProduction = env.NODE_ENV === 'production';

  res.cookie('algopulse_token', result.token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.json({
    user: {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      created_at: result.user.created_at
    }
  });
});

router.post('/logout', (req, res) => {
  res.clearCookie('algopulse_token');
  res.json({ message: 'Logged out successfully' });
});

router.get('/me', requireAuth, (req: AuthRequest, res) => {
  const db = getDb();
  const accounts = db
    .prepare('SELECT * FROM platform_accounts WHERE user_id = ? ORDER BY platform, username')
    .all(req.userId!) as PlatformAccount[];

  res.json({
    user: {
      id: req.user!.id,
      name: req.user!.name,
      email: req.user!.email,
      created_at: req.user!.created_at
    },
    connectedProfiles: accounts.map(acc => ({
      id: acc.id,
      platform: acc.platform,
      username: acc.username,
      profile_url: acc.profile_url,
      connected_at: acc.connected_at,
      last_verified_at: acc.last_verified_at
    }))
  });
});

export { router as authRouter };
