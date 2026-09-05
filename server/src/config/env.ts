import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  JWT_SECRET: z.string().min(1, 'JWT_SECRET cannot be empty'),
  SQLITE_DATABASE_PATH: z.string().default('./data/algopulse.db'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  PORT: z.string().default('3000').transform(Number),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string().optional(),
  MONGODB_DATABASE: z.string().default('algopulse'),
  GEMINI_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formattedIssues = result.error.issues
      .map((issue) => {
        const path = issue.path.length > 0 ? issue.path.join('.') : 'root';
        return `  • [${path}]: ${issue.message}`;
      })
      .join('\n');

    const errorMessage = `[AlgoPulse Configuration Error] Environment variable validation failed:\n${formattedIssues}\nPlease check your .env file.`;
    throw new Error(errorMessage);
  }

  return result.data;
}

export const env = loadEnv();
