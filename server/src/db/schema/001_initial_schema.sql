CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS platform_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  username TEXT NOT NULL,
  profile_url TEXT,
  connected_at TEXT NOT NULL,
  last_verified_at TEXT,
  last_synced_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (user_id, platform, username)
);

CREATE INDEX IF NOT EXISTS idx_platform_accounts_user_id ON platform_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_accounts_platform_username ON platform_accounts(platform, username);

CREATE TABLE IF NOT EXISTS problems (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL,
  external_id TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT,
  difficulty TEXT,
  rating INTEGER,
  description TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (platform, external_id)
);

CREATE INDEX IF NOT EXISTS idx_problems_platform ON problems(platform);

CREATE TABLE IF NOT EXISTS problem_topics (
  id TEXT PRIMARY KEY,
  problem_id TEXT NOT NULL,
  topic TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 1.0,
  FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_problem_topics_problem_id ON problem_topics(problem_id);
CREATE INDEX IF NOT EXISTS idx_problem_topics_topic ON problem_topics(topic);

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  problem_id TEXT NOT NULL,
  platform_account_id TEXT NOT NULL,
  external_submission_id TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  language TEXT NOT NULL,
  verdict TEXT NOT NULL,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  execution_time REAL,
  memory_used REAL,
  FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE,
  FOREIGN KEY (platform_account_id) REFERENCES platform_accounts(id) ON DELETE CASCADE,
  UNIQUE (platform_account_id, external_submission_id)
);

CREATE INDEX IF NOT EXISTS idx_submissions_platform_account_id ON submissions(platform_account_id);
CREATE INDEX IF NOT EXISTS idx_submissions_problem_id ON submissions(problem_id);
CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at ON submissions(submitted_at);

CREATE TABLE IF NOT EXISTS contests (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL,
  external_id TEXT NOT NULL,
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  rating_change INTEGER,
  rank INTEGER,
  UNIQUE (platform, external_id)
);

CREATE INDEX IF NOT EXISTS idx_contests_platform ON contests(platform);

CREATE TABLE IF NOT EXISTS contest_problems (
  id TEXT PRIMARY KEY,
  contest_id TEXT NOT NULL,
  problem_id TEXT NOT NULL,
  problem_index TEXT NOT NULL,
  FOREIGN KEY (contest_id) REFERENCES contests(id) ON DELETE CASCADE,
  FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_contest_problems_contest_id ON contest_problems(contest_id);
CREATE INDEX IF NOT EXISTS idx_contest_problems_problem_id ON contest_problems(problem_id);

CREATE TABLE IF NOT EXISTS contest_submissions (
  id TEXT PRIMARY KEY,
  contest_id TEXT NOT NULL,
  submission_id TEXT NOT NULL,
  FOREIGN KEY (contest_id) REFERENCES contests(id) ON DELETE CASCADE,
  FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_contest_submissions_contest_id ON contest_submissions(contest_id);
CREATE INDEX IF NOT EXISTS idx_contest_submissions_submission_id ON contest_submissions(submission_id);

CREATE TABLE IF NOT EXISTS skill_scores (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  topic TEXT NOT NULL,
  score REAL NOT NULL,
  confidence REAL NOT NULL DEFAULT 1.0,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (user_id, topic)
);

CREATE INDEX IF NOT EXISTS idx_skill_scores_user_id ON skill_scores(user_id);

CREATE TABLE IF NOT EXISTS skill_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  topic TEXT NOT NULL,
  score REAL NOT NULL,
  timestamp TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_skill_history_user_id ON skill_history(user_id);

CREATE TABLE IF NOT EXISTS failure_patterns (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  topic TEXT NOT NULL,
  failure_type TEXT NOT NULL,
  frequency INTEGER NOT NULL DEFAULT 1,
  severity REAL NOT NULL DEFAULT 1.0,
  first_detected TEXT NOT NULL,
  last_detected TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_failure_patterns_user_id ON failure_patterns(user_id);

CREATE TABLE IF NOT EXISTS recommendations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  problem_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  completed_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_recommendations_user_id ON recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_problem_id ON recommendations(problem_id);

CREATE TABLE IF NOT EXISTS sync_state (
  id TEXT PRIMARY KEY,
  platform_account_id TEXT NOT NULL,
  cursor TEXT,
  last_submission_time TEXT,
  last_sync TEXT NOT NULL,
  FOREIGN KEY (platform_account_id) REFERENCES platform_accounts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sync_state_platform_account_id ON sync_state(platform_account_id);
