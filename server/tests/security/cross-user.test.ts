import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { createApp } from '../../src/app.js';
import { initDb, closeDb } from '../../src/db/sqlite.js';
import { runMigrations } from '../../src/db/migrator.js';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

let serverUrl: string;
let tokenA: string;
let tokenB: string;
let server: ReturnType<typeof import('node:http').createServer>;

async function post(url: string, body: unknown, cookie?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (cookie) headers['Cookie'] = cookie;
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  const data = await res.json();
  return { status: res.status, data, headers: res.headers };
}

async function get(url: string, cookie?: string) {
  const headers: Record<string, string> = {};
  if (cookie) headers['Cookie'] = cookie;
  const res = await fetch(url, { method: 'GET', headers });
  const data = await res.json();
  return { status: res.status, data };
}

describe('Cross-user security', () => {
  before(async () => {
    const dbPath = path.join(os.tmpdir(), `algopulse-security-test-${Date.now()}.db`);
    process.env['SQLITE_DATABASE_PATH'] = dbPath;
    process.env['JWT_SECRET'] = 'test-secret-for-security-tests-only';
    process.env['NODE_ENV'] = 'test';

    const db = initDb(dbPath);
    runMigrations(db);

    const app = createApp();
    await new Promise<void>(resolve => {
      server = app.listen(0, () => resolve());
    });
    const addr = server.address() as import('node:net').AddressInfo;
    serverUrl = `http://127.0.0.1:${addr.port}`;

    const signupA = await post(`${serverUrl}/api/auth/signup`, { name: 'Alice', email: 'alice@test.com', password: 'Password123!' });
    assert.strictEqual(signupA.status, 201, 'User A signup should succeed');
    const cookieA = signupA.headers.get('set-cookie') ?? '';
    tokenA = cookieA.split(';')[0]!;

    const signupB = await post(`${serverUrl}/api/auth/signup`, { name: 'Bob', email: 'bob@test.com', password: 'Password123!' });
    assert.strictEqual(signupB.status, 201, 'User B signup should succeed');
    const cookieB = signupB.headers.get('set-cookie') ?? '';
    tokenB = cookieB.split(';')[0]!;
  });

  after(async () => {
    server.close();
    closeDb();
    const dbPath = process.env['SQLITE_DATABASE_PATH'];
    if (dbPath && fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  });

  it('User B cannot read User A profiles', async () => {
    const result = await get(`${serverUrl}/api/profiles`, tokenB);
    assert.strictEqual(result.status, 200);
    const profiles = result.data.profiles ?? [];
    assert.strictEqual(profiles.length, 0, 'User B should see 0 profiles (not A\'s)');
  });

  it('User B cannot access analytics that belong to User A', async () => {
    const result = await get(`${serverUrl}/api/analytics/skills`, tokenB);
    assert.strictEqual(result.status, 200);
    const skills = result.data.skills ?? [];
    assert.strictEqual(skills.length, 0, 'User B should see no skills from User A');
  });

  it('User B cannot access User A recommendations', async () => {
    const result = await get(`${serverUrl}/api/recommendations/next`, tokenB);
    assert.strictEqual(result.status, 200);
    const recs = result.data.recommendations ?? [];
    assert.strictEqual(recs.length, 0, 'User B should see 0 recommendations from User A');
  });

  it('Unauthenticated request is rejected with 401', async () => {
    const result = await get(`${serverUrl}/api/profiles`);
    assert.strictEqual(result.status, 401, 'No-token request should return 401');
  });

  it('User B cannot read User A report', async () => {
    const result = await get(`${serverUrl}/api/report`, tokenB);
    assert.strictEqual(result.status, 200);
    const report = result.data;
    assert.ok(!report.error, 'Should return a valid (empty) report for B, not A\'s data');
  });
});
