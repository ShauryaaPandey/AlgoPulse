export interface SkillScore {
  id: string;
  user_id: string;
  topic: string;
  score: number;
  confidence: number;
  updated_at: string;
}

export interface SkillHistory {
  id: string;
  user_id: string;
  topic: string;
  score: number;
  timestamp: string;
}

export interface FailurePattern {
  id: string;
  user_id: string;
  topic: string;
  failure_type: string;
  frequency: number;
  severity: number;
  first_detected: string;
  last_detected: string;
}

export interface TopicProficiency {
  topic: string;
  score: number;
  confidence: number;
  totalSubmissions: number;
  acceptedSubmissions: number;
  lastPracticed: string | null;
}
