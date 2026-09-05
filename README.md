# AlgoPulse

A full-stack competitive programming analytics platform. Connect your Codeforces, LeetCode, and CodeChef profiles, sync your submission history, and get deterministic skill analysis, personalised problem recommendations, AI-powered explanations, semantic search, and interview prep intelligence — all in one place.

---

## Architecture

```
React Client (Vite + Tailwind)
    │
    │  HTTP/REST (cookies, JSON)
    ▼
Express API  (TypeScript, Node.js)
    ├── Auth         — JWT in httpOnly cookies, bcrypt password hashing
    ├── Profiles     — connect/verify Codeforces, LeetCode, CodeChef via platform adapters
    ├── Ingestion    — sync submissions, problems, contests via platform adapters → SQLite
    ├── Analytics    — deterministic engines: skill scores, weaknesses, failures, progress, decay, contests
    ├── Recommendations — next problems, week-by-week roadmap, revision list
    ├── Vector Search ──── MongoDB Atlas Vector Search + Gemini embeddings
    ├── AI Layer     ───── Gemini 1.5 Flash (structured output) explains pre-computed analytics
    ├── Interview Intel ─── company topic-weight profiles → readiness score
    └── Report       — full analytics snapshot exportable as JSON or Markdown
    │
    ├── SQLite (better-sqlite3)
    │     tables: users, platform_accounts, problems, problem_topics, submissions,
    │             contests, contest_problems, contest_submissions,
    │             skill_scores, skill_history, failure_patterns,
    │             recommendations, sync_state
    │
    └── MongoDB Atlas
          collection: problems  { problemId, platform, title, topics, difficulty, embedding[768] }
```

---

## Setup

### Prerequisites

- Node.js ≥ 20
- npm ≥ 10
- (Optional) MongoDB Atlas cluster with Vector Search index named `problems_vector_index`
- (Optional) Google Gemini API key from [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)

### Install

```bash
npm install          # installs root + both workspaces
```

### Configure environment

```bash
# server
cp server/.env.example server/.env
# edit server/.env — at minimum set JWT_SECRET

# client
cp client/.env.example client/.env
# VITE_API_URL defaults to http://localhost:3000/api
```

### Run in development

```bash
npm run dev          # starts both server (port 3000) and client (port 5173) concurrently
```

### Run tests

```bash
npm test --workspace=server
```

### MongoDB Atlas Vector Search (optional)

1. Create a free M0 cluster at [cloud.mongodb.com](https://cloud.mongodb.com)
2. Enable **Atlas Vector Search** on your cluster
3. Create a search index named `problems_vector_index` on the `algopulse.problems` collection:

```json
{
  "fields": [
    { "type": "vector", "path": "embedding", "numDimensions": 768, "similarity": "cosine" },
    { "type": "filter", "path": "topics" },
    { "type": "filter", "path": "platform" },
    { "type": "filter", "path": "difficulty" },
    { "type": "filter", "path": "rating" }
  ]
}
```

4. Add `MONGODB_URI` and `MONGODB_DATABASE` to `server/.env`
5. Add `GEMINI_API_KEY` for embeddings + AI explanations

Problems are automatically indexed into MongoDB after each sync. The `GET /api/health` endpoint reports whether Mongo and AI are configured.

---

## API Route Reference

All routes (except `/api/auth/*` and `/api/health`) require authentication via the `algopulse_token` httpOnly cookie set on login/signup.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/signup` | No | Create account. Rate limited: 10 req/15 min. |
| POST | `/api/auth/login` | No | Login, sets httpOnly cookie. Rate limited: 10 req/15 min. |
| POST | `/api/auth/logout` | No | Clears auth cookie. |
| GET | `/api/auth/me` | Yes | Current user + connected profiles. |
| GET | `/api/health` | No | `{ status, mongoConfigured, aiConfigured }` |
| GET | `/api/profiles` | Yes | List connected platform profiles. |
| POST | `/api/profiles` | Yes | Connect a new profile by URL. |
| DELETE | `/api/profiles/:platform` | Yes | Remove a connected profile. |
| POST | `/api/profiles/verify` | Yes | Re-verify all connected profiles. |
| POST | `/api/sync` | Yes | Sync all platforms. `?platform=codeforces` for one. `?full=true` for full re-sync. |
| POST | `/api/sync?platform=X` | Yes | Sync a single platform. |
| GET | `/api/sync/status` | Yes | Last sync time per connected platform. |
| GET | `/api/analytics/skills` | Yes | Per-topic skill scores (0–100) + difficulty ceilings. |
| GET | `/api/analytics/weaknesses` | Yes | Topics ranked by weakness score + severity. |
| GET | `/api/analytics/failures` | Yes | Verdict distribution + recurring failure patterns. |
| GET | `/api/analytics/progress` | Yes | Month-by-month skill trend per topic. |
| GET | `/api/analytics/contests` | Yes | Contest performance by problem index + decay warnings. |
| GET | `/api/recommendations/next` | Yes | Ranked list of next problems to solve. |
| GET | `/api/recommendations/roadmap` | Yes | Week-by-week practice roadmap. `?weeks=N` |
| GET | `/api/recommendations/revise` | Yes | Previously-failed problems worth revisiting. |
| POST | `/api/recommendations/:id/dismiss` | Yes | Mark a recommendation as dismissed. |
| GET | `/api/search?q=<query>` | Yes | Semantic vector search. Optional: `topic`, `platform`, `difficulty`, `minRating`, `maxRating`, `limit`. |
| GET | `/api/search/similar/:id` | Yes | Find semantically similar unsolved problems for a given problem. |
| GET | `/api/problems/:id/similar` | Yes | Same as above, alternate path. |
| GET | `/api/explain` | Yes | AI explanation of overall skill profile. |
| GET | `/api/explain/weaknesses` | Yes | AI explanation of weakness analysis. |
| GET | `/api/explain/failures` | Yes | AI explanation of failure patterns. |
| GET | `/api/explain/progress` | Yes | AI explanation of progress trends. |
| GET | `/api/explain/roadmap` | Yes | AI explanation of recommended roadmap. |
| GET | `/api/interview?company=X` | Yes | Interview prep areas + readiness score (0–100) for a company. |
| GET | `/api/report?format=json\|markdown` | Yes | Download full analytics report as JSON or Markdown. |

---

## Manual Verification Checklist

- [ ] Signup → login → cookie set, `/api/auth/me` returns user
- [ ] Connect Codeforces profile URL → verified and stored
- [ ] Connect LeetCode profile URL → verified and stored
- [ ] Connect CodeChef profile URL → verified and stored
- [ ] Sync → new submissions/problems/contests written to SQLite
- [ ] Skills page shows per-topic skill scores with bar charts
- [ ] Weaknesses page shows severity-ranked topic cards
- [ ] Failures page shows verdict pie chart + Failure DNA patterns
- [ ] Progress page shows monthly line chart with improvement/regression badges
- [ ] Contests page shows solve rate by problem index
- [ ] Next Problems shows ranked recommendation cards
- [ ] Roadmap shows week-by-week timeline
- [ ] Revise shows failed-problem groups by failure type
- [ ] Search (with Mongo+Gemini configured) returns semantic results
- [ ] Find Similar modal shows related unsolved problems
- [ ] AI Explain buttons on each analytics sub-page work with GEMINI_API_KEY
- [ ] Interview Prep shows preparation areas and readiness score for a company
- [ ] Report: Download JSON → opens file · Download Markdown → opens file
- [ ] Logout → cookie cleared, redirected to /login
- [ ] Unauthenticated API request returns 401
- [ ] User B cannot read User A's data (cross-user security)

---

## License

MIT — see [LICENSE](./LICENSE)
