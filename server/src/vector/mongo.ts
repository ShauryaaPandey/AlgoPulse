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

let clientPromise: Promise<MongoClient> | null = null;

function createClient(): Promise<MongoClient> {
  if (!env.MONGODB_URI) {
    return Promise.reject(new Error('MONGODB_URI is not configured.'));
  }

  const c = new MongoClient(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 30000,
    tls: true,
    retryWrites: true,
    retryReads: true
  });

  return c.connect().then(() => {
    logger.info('MongoDB connected');
    c.on('close', () => {
      logger.warn('MongoDB connection closed — will reconnect on next call');
      clientPromise = null;
    });
    c.on('error', (err) => {
      logger.warn('MongoDB client error — resetting connection:', (err as Error).message);
      clientPromise = null;
    });
    return c;
  });
}

export async function getMongoClient(): Promise<MongoClient> {
  if (!env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not configured. Set it in your .env to enable vector search.');
  }

  if (!clientPromise) {
    clientPromise = createClient().catch(err => {
      clientPromise = null;
      throw err;
    });
  }

  return clientPromise;
}

export async function getMongoDb(): Promise<Db> {
  const c = await getMongoClient();
  return c.db(env.MONGODB_DATABASE);
}

export async function getProblemsCollection(): Promise<Collection<ProblemDocument>> {
  const d = await getMongoDb();
  return d.collection<ProblemDocument>('problems');
}

export async function closeMongoClient(): Promise<void> {
  if (clientPromise) {
    try {
      const c = await clientPromise;
      await c.close();
    } catch {
    } finally {
      clientPromise = null;
      logger.info('MongoDB disconnected');
    }
  }
}

export function isMongoConfigured(): boolean {
  return Boolean(env.MONGODB_URI);
}
