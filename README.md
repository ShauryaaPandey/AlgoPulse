# AlgoPulse

A full-stack competitive programming intelligence platform that turns your real submission history into a deterministic skill analysis. AlgoPulse connects to Codeforces, LeetCode, and CodeChef, and combines a rules-based analytics engine with Google Gemini AI and MongoDB Atlas Vector Search to tell you exactly what to practice next, why, and how ready you are for a specific company's interviews.

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)

## Key Features

### Multi-Platform Integration
- **Unified Profile Connection** across Codeforces, LeetCode, and CodeChef from a single pasted URL
- **Automatic Platform Detection** and username extraction with live profile verification
- **Incremental Sync Engine** that ingests submissions, problems, and contests without creating duplicates
- **Platform-Agnostic Core** — analytics and recommendations operate identically regardless of source platform

### Deterministic Analytics Engine
- **Per-Topic Skill Scoring** based on success rate, difficulty weighting, recency, contest performance, and consistency
- **Failure Pattern Detection** that classifies recurring mistakes (for example, boundary errors, out-of-bounds access, brute-force timeouts)
- **Skill Decay Warnings** when a previously strong topic has gone unpracticed
- **Monthly Progress Trends** with automatic flagging of improvement, regression, and stagnation
- **Contest Performance Breakdown** by problem index across all tracked contests

### AI-Powered Intelligence
- **Structured Explanations** using Google Gemini to translate computed analytics into plain-English insights
- **Company-Aware Interview Prep** combining skill coverage, difficulty ceiling, and topic trends into a readiness score
- **Explain-Only AI Boundary** — Gemini never calculates scores or recommendations, it only interprets results already computed deterministically

### Semantic Search & Vector Retrieval
- **Vector Embeddings** using Google's `gemini-embedding-001` model (768-dimensional)
- **Natural Language Problem Search** — find problems by intent ("graph problems with DSU") rather than exact keyword match
- **Find Similar** recommendations for any problem, filtered to exclude problems already solved
- **MongoDB Atlas Vector Search** with metadata filtering by topic, platform, and difficulty

### Recommendation System
- **Ranked Next Problems** with explicit, human-readable reasoning
- **Week-by-Week Roadmap** prioritizing the weakest and highest-decay topics first
- **Spaced Revision Queue** resurfacing previously failed problems worth retrying
- **Automatic Completion Tracking** — recommendations close themselves out once the user solves the underlying problem

## Tech Stack

**Frontend**
React 18, TypeScript, Vite, TailwindCSS, React Router, TanStack Query, React Hook Form, Recharts

**Backend**
Node.js, Express, TypeScript, better-sqlite3, MongoDB Driver

**AI/ML**
Google Gemini AI (`gemini-2.5-flash` for text generation, `gemini-embedding-001` for vector embeddings) via the Vercel AI SDK

**Authentication & Security**
JWT (httpOnly cookies), bcrypt, Helmet, CORS, rate limiting, per-user data scoping

**Data Layer**
SQLite (WAL mode) for relational data, MongoDB Atlas for vector search

## Quick Start

### Prerequisites
- Node.js v20 or higher, npm v10 or higher
- MongoDB Atlas cluster (optional, required only for semantic search)
- Google Gemini API key (optional, required only for AI explanations and embeddings) — [get one here](https://aistudio.google.com/app/apikey)

The application runs fully without MongoDB or Gemini configured. Those features display a clear "not configured" notice instead of failing.

### Installation

```bash
git clone <your-repo-url>
cd AlgoPulse
npm install
```

This installs dependencies for both the `server` and `client` workspaces from the project root.

### Environment Setup

Create `.env` in `server/`:
```env
JWT_SECRET=your_secure_random_string_here
SQLITE_DATABASE_PATH=./data/algopulse.db
PORT=3000
CLIENT_URL=http://localhost:5173
NODE_ENV=development
LOG_LEVEL=info
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?appName=AlgoPulse
MONGODB_DATABASE=algopulse
GEMINI_API_KEY=your_gemini_api_key_here
```

Create `.env` in `client/`:
```env
VITE_API_URL=http://localhost:3000
```

> Only `JWT_SECRET` is strictly required to run the application. `MONGODB_URI` and `GEMINI_API_KEY` unlock semantic search and AI features.

### Running the Application

```bash
npm run dev
```

This starts the Express API on `http://localhost:3000` and the React client on `http://localhost:5173` concurrently.

Access the application at `http://localhost:5173`.

### Running Tests

```bash
npm test --workspace=server
```

## Core Workflows

### Connecting a Profile
1. Paste a Codeforces, LeetCode, or CodeChef profile URL into the Profiles page
2. The platform is auto-detected and the profile is verified against the live platform
3. Once connected, run a sync to pull submissions, problems, and contests into the database

### Analytics & Recommendations
1. After syncing, visit the Analytics section to view per-topic skill scores, weaknesses, failure patterns, and progress trends
2. Visit Recommendations for a ranked list of next problems, a full roadmap, and a revision queue
3. Each recommendation includes a plain-English reason grounded in your actual data

### Semantic Search
- Enter a natural language query such as "binary search on answer" or "DP on trees"
- Results are ranked by vector similarity and automatically exclude problems already solved
- Use "Find Similar" on any problem to surface related unsolved problems

### AI Explanations & Interview Prep
- Open any analytics page and request an AI explanation for a plain-English summary of the underlying data
- Visit Interview Prep and select a company to see prioritized topics and a deterministic readiness score

## Architecture Highlights

**Analytics Pipeline**
Submissions and problems flow through a normalization and deduplication layer into SQLite, where five deterministic engines (skill, weakness, failure, decay, contest) compute scores that are persisted and versioned in a skill history table for trend analysis.

**Vector Embedding Pipeline**
Problem metadata (title, topics, description) is embedded using Gemini's embedding model at a fixed 768 dimensions, upserted into MongoDB Atlas idempotently, and queried through Atlas Vector Search with metadata pre-filtering.

**Security**
JWT authentication delivered via httpOnly, sameSite cookies, bcrypt password hashing, strict per-user data scoping on every query, Helmet and CORS hardening, and stricter rate limits on authentication routes.

## Project Structure

```
AlgoPulse/
├── client/                          # React TypeScript frontend
│   ├── src/
│   │   ├── pages/                   # Dashboard, Analytics, Recommendations, Search, etc.
│   │   ├── components/              # Reusable UI components
│   │   └── lib/                     # API client, hooks, auth context
│   └── package.json
├── server/                          # Node.js TypeScript backend
│   ├── src/
│   │   ├── adapters/                # Codeforces, LeetCode, CodeChef adapters
│   │   ├── analytics/               # Skill, weakness, failure, decay, contest engines
│   │   ├── recommendations/         # Next-problem, roadmap, revision logic
│   │   ├── vector/                  # Embeddings and MongoDB vector search
│   │   ├── ai/                      # Gemini client and structured explanations
│   │   ├── ingestion/               # Sync manager, normalizer, deduplicator
│   │   ├── db/                      # SQLite schema, migrations, repositories
│   │   └── routes/                  # Express route handlers
│   └── tests/
└── README.md
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `JWT_SECRET` | Secret used to sign authentication tokens | Yes |
| `SQLITE_DATABASE_PATH` | Path to the SQLite database file | No |
| `PORT` | Server port | No |
| `CLIENT_URL` | Frontend origin allowed by CORS | No |
| `MONGODB_URI` | MongoDB Atlas connection string | No |
| `MONGODB_DATABASE` | MongoDB database name | No |
| `GEMINI_API_KEY` | Google Gemini API key | No |
| `VITE_API_URL` | API base URL used by the frontend | No |

## Development Commands

**Root**
```bash
npm run dev          # Starts server and client together
npm run typecheck    # Typechecks both workspaces
npm test             # Runs the server test suite
```

**Server**
```bash
npm run dev          # tsx watch mode
npm run build        # Compile TypeScript
npm run typecheck    # Type checking only
npm test             # Node test runner
```

**Client**
```bash
npm run dev          # Vite dev server with HMR
npm run build        # Production build
npm run preview      # Preview production build
```

## Troubleshooting

**Server won't start**
- Confirm `server/.env` exists and includes at least `JWT_SECRET`
- Confirm the `.env` file has actually been saved to disk, not just typed in the editor

**MongoDB connection fails with a TLS/SSL error**
- Confirm the cluster is not paused and your IP is allowed under Atlas Network Access
- Try upgrading the `mongodb` driver, or test connectivity from a different network
- The application will continue running normally with semantic search disabled while this is unresolved

**AI features return an error**
- Confirm `GEMINI_API_KEY` is set and valid at [Google AI Studio](https://aistudio.google.com/)
- Check server logs for the specific Gemini error message

**Semantic search returns no results**
- Confirm a sync has completed at least once so problems exist to index
- Confirm `GET /api/health` reports both `mongoConfigured` and `aiConfigured` as true

## Performance Notes

- Incremental sync avoids re-fetching or re-processing already-ingested data
- SQLite runs in WAL mode for concurrent read/write performance
- Client bundle is code-split by route to keep initial load size small
- Vector indexing runs in the background after sync and never blocks the sync response

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Run `npm run typecheck` and `npm test --workspace=server` before committing
4. Commit changes (`git commit -m "feat: add new feature"`)
5. Push to your branch and open a Pull Request

## License

MIT License — see [LICENSE](./LICENSE) for details.

---

**Built to answer one question honestly: what should I actually practice next?**