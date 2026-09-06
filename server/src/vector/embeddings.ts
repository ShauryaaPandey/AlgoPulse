import { google } from '@ai-sdk/google';
import { embed, embedMany } from 'ai';
import { env } from '../config/env.js';

const EMBEDDING_MODEL = 'gemini-embedding-001';
const EMBEDDING_DIMENSIONS = 768;

export { EMBEDDING_DIMENSIONS };

const PROVIDER_OPTIONS = {
  google: { outputDimensionality: EMBEDDING_DIMENSIONS }
} as const;

export function isEmbeddingConfigured(): boolean {
  return Boolean(env.GEMINI_API_KEY);
}

function buildProblemText(
  title: string,
  topics: string[],
  difficulty: string | null,
  description?: string | null
): string {
  const parts: string[] = [title];
  if (topics.length > 0) parts.push(`Topics: ${topics.join(', ')}`);
  if (difficulty) parts.push(`Difficulty: ${difficulty}`);
  if (description) parts.push(description.slice(0, 512));
  return parts.join('. ');
}

export async function embedText(text: string): Promise<number[]> {
  if (!env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured. Set it in your .env to enable embeddings.');
  }

  const model = google.textEmbeddingModel(EMBEDDING_MODEL);
  const { embedding } = await embed({ model, value: text, providerOptions: PROVIDER_OPTIONS });
  return embedding;
}

export async function embedProblem(
  title: string,
  topics: string[],
  difficulty: string | null,
  description?: string | null
): Promise<number[]> {
  const text = buildProblemText(title, topics, difficulty, description);
  return embedText(text);
}

export async function embedManyTexts(texts: string[]): Promise<number[][]> {
  if (!env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  const model = google.textEmbeddingModel(EMBEDDING_MODEL);
  const { embeddings } = await embedMany({ model, values: texts, providerOptions: PROVIDER_OPTIONS });
  return embeddings;
}

export async function embedManyProblems(
  problems: Array<{ title: string; topics: string[]; difficulty: string | null; description?: string | null }>
): Promise<number[][]> {
  const texts = problems.map(p => buildProblemText(p.title, p.topics, p.difficulty, p.description));
  return embedManyTexts(texts);
}
