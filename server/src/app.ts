import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import 'express-async-errors';
import { errorHandler } from './middleware/error-handler.js';
import { authRouter } from './routes/auth.js';
import { profilesRouter } from './routes/profiles.js';
import { syncRouter } from './routes/sync.js';
import { analyticsRouter } from './routes/analytics.js';
import { recommendationsRouter } from './routes/recommendations.js';
import { env } from './config/env.js';

export function createApp() {
  const app = express();

  app.use(helmet());

  app.use(cors({
    origin: env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
  }));

  app.use(cookieParser());
  app.use(express.json());

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later'
      }
    },
    standardHeaders: true,
    legacyHeaders: false
  });

  app.use('/api/', limiter);

  app.use('/api/auth', authRouter);
  app.use('/api/profiles', profilesRouter);
  app.use('/api/sync', syncRouter);
  app.use('/api/analytics', analyticsRouter);
  app.use('/api/recommendations', recommendationsRouter);

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.use(errorHandler);

  return app;
}
