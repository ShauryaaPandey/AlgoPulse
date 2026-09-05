import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { env } from '../config/env.js';

let _provider: ReturnType<typeof createGoogleGenerativeAI> | null = null;

export function getGeminiProvider(): ReturnType<typeof createGoogleGenerativeAI> {
  if (_provider) return _provider;

  if (!env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured. Add it to your .env to enable AI explanations.');
  }

  _provider = createGoogleGenerativeAI({ apiKey: env.GEMINI_API_KEY });
  return _provider;
}

export function getGenerativeModel(modelId = 'gemini-1.5-flash') {
  const provider = getGeminiProvider();
  return provider(modelId);
}

export function isAiConfigured(): boolean {
  return Boolean(env.GEMINI_API_KEY);
}
