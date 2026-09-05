import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export interface SessionData {
  token: string;
  user?: {
    userId: string;
    email: string;
    name?: string;
  };
  savedAt?: string;
}

const SESSION_DIR = path.join(os.homedir(), '.algopulse');
const SESSION_FILE = path.join(SESSION_DIR, 'session.json');

export function getSessionFilePath(): string {
  return SESSION_FILE;
}

export function saveSession(
  token: string,
  user?: { userId: string; email: string; name?: string }
): void {
  if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
  }

  const data: SessionData = {
    token,
    user,
    savedAt: new Date().toISOString(),
  };

  fs.writeFileSync(SESSION_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export function getSession(): SessionData | null {
  try {
    if (!fs.existsSync(SESSION_FILE)) {
      return null;
    }
    const raw = fs.readFileSync(SESSION_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || typeof parsed.token !== 'string') {
      return null;
    }
    return parsed as SessionData;
  } catch {
    return null;
  }
}

export function getSessionToken(): string | null {
  const session = getSession();
  return session ? session.token : null;
}

export function clearSession(): void {
  try {
    if (fs.existsSync(SESSION_FILE)) {
      fs.unlinkSync(SESSION_FILE);
    }
  } catch {}
}
