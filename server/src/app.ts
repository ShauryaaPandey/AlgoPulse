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
import { searchRouter } from './routes/search.js';
import { explainRouter } from './routes/explain.js';
import { interviewRouter } from './routes/interview.js';
import { problemsRouter } from './routes/problems.js';
import { reportRouter } from './routes/report.js';
import { env } from './config/env.js';
import { isMongoConfigured } from './vector/mongo.js';
import { isAiConfigured } from './ai/client.js';

export function createApp() {
  const app = express();

  app.use(helmet());

  app.use(cors({
    origin: env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
  }));

  app.use(cookieParser());
  app.use(express.json());

  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
      error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests, please try again later' }
    },
    standardHeaders: true,
    legacyHeaders: false
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: {
      error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many login attempts, please try again later' }
    },
    standardHeaders: true,
    legacyHeaders: false
  });

  app.use('/api/', generalLimiter);
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/signup', authLimiter);

  app.use('/api/auth', authRouter);
  app.use('/api/profiles', profilesRouter);
  app.use('/api/sync', syncRouter);
  app.use('/api/analytics', analyticsRouter);
  app.use('/api/recommendations', recommendationsRouter);
  app.use('/api/search', searchRouter);
  app.use('/api/explain', explainRouter);
  app.use('/api/interview', interviewRouter);
  app.use('/api/problems', problemsRouter);
  app.use('/api/report', reportRouter);

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      mongoConfigured: isMongoConfigured(),
      aiConfigured: isAiConfigured()
    });
  });

  app.use(errorHandler);

  return app;
}
