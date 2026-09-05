import { Platform } from '../config/constants.js';

export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard' | string;

export interface Problem {
  id: string;
  platform: Platform | string;
  external_id: string;
  title: string;
  url: string | null;
  difficulty: DifficultyLevel | null;
  rating: number | null;
  description: string | null;
  created_at: string;
}

export interface PlatformProblem {
  platform: Platform | string;
  external_id: string;
  title: string;
  url?: string | null;
  difficulty?: DifficultyLevel | null;
  rating?: number | null;
  description?: string | null;
  topics?: string[];
}

export interface ProblemTopic {
  id: string;
  problem_id: string;
  topic: string;
  confidence: number;
}
