import { MongoClient, type Db, type Collection } from 'mongodb';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export interface ProblemDocument {
  problemId: string;
  platform: string;
  title: string;
  topics: string[];
  difficulty: string | null;
  rating: number | null;
  embedding: number[];
  indexedAt: string;
}

let client: MongoClient | null = null;
let db: Db | null = null;

export async function getMongoClient(): Promise<MongoClient> {
  if (client) return client;

  if (!env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not configured. Set it in your .env to enable vector search.');
  }

  client = new MongoClient(env.MONGODB_URI);
  await client.connect();
  logger.info('MongoDB connected');
  return client;
}

export async function getMongoDb(): Promise<Db> {
  if (db) return db;
  const c = await getMongoClient();
  db = c.db(env.MONGODB_DATABASE);
  return db;
}

export async function getProblemsCollection(): Promise<Collection<ProblemDocument>> {
  const d = await getMongoDb();
  return d.collection<ProblemDocument>('problems');
}

export async function closeMongoClient(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    logger.info('MongoDB disconnected');
  }
}

export function isMongoConfigured(): boolean {
  return Boolean(env.MONGODB_URI);
}
