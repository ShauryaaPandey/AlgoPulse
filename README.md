# AlgoPulse

A full-stack web application for competitive programming analytics. Connect your coding profiles from Codeforces, LeetCode, and CodeChef to analyze your skill patterns, identify weaknesses, and get personalized problem recommendations.

## Features

- 🔐 Secure authentication with JWT and httpOnly cookies
- 🔗 Connect multiple competitive programming profiles (Codeforces, LeetCode, CodeChef)
- ✅ Automated profile verification via platform APIs
- 📊 Dashboard showing connected profiles and account stats
- 🎯 Clean, responsive UI built with React and TailwindCSS

## Tech Stack

### Backend (server/)
- Express.js with TypeScript
- SQLite with better-sqlite3
- JWT authentication with httpOnly cookies
- Helmet, CORS, rate limiting
- Zod for request validation
- Existing adapters: Codeforces (with rate limiting and retry logic)

### Frontend (client/)
- React 18 with TypeScript
- Vite for fast development
- TailwindCSS for styling
- React Router for navigation
- React Hook Form + Zod for form validation
- Axios for API calls
- TanStack React Query for data fetching

## Project Structure

```
AlgoPulse/
├── server/              # Backend Express API
│   ├── src/
│   │   ├── adapters/    # Platform adapters (Codeforces, LeetCode, CodeChef)
│   │   ├── auth/        # Authentication logic
│   │   ├── db/          # Database setup and migrations
│   │   ├── middleware/  # Express middleware
│   │   ├── routes/      # API routes
│   │   ├── profiles/    # URL parsing and platform detection
│   │   ├── types/       # TypeScript types
│   │   ├── utils/       # Utility functions
│   │   ├── app.ts       # Express app setup
│   │   └── index.ts     # Server entry point
│   └── tests/           # Server tests
├── client/              # Frontend React app
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── context/     # React context (Auth)
│   │   ├── lib/         # Utilities (API client)
│   │   ├── pages/       # Page components
│   │   ├── App.tsx      # Main app component
│   │   └── main.tsx     # React entry point
│   └── public/          # Static assets
└── data/                # SQLite database file
```

## Setup

### Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd AlgoPulse
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:

Create `server/.env` based on `server/.env.example`:
```bash
cp server/.env.example server/.env
```

Required environment variables:
```env
JWT_SECRET=your-secret-key-change-in-production
SQLITE_DATABASE_PATH=./data/algopulse.db
LOG_LEVEL=info
PORT=3000
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

4. The database will be automatically created and migrated on first server start.

### Development

Start both server and client in development mode:
```bash
npm run dev
```

This runs:
- Server on http://localhost:3000
- Client on http://localhost:5173

The client is configured to proxy API requests to the server.

### Individual Commands

Run server only:
```bash
npm run dev --workspace=server
```

Run client only:
```bash
npm run dev --workspace=client
```

Build both:
```bash
npm run build
```

Run tests:
```bash
npm test
```

Type checking:
```bash
npm run typecheck
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Sign in
- `POST /api/auth/logout` - Sign out
- `GET /api/auth/me` - Get current user and connected profiles

### Profiles
- `GET /api/profiles` - List connected profiles
- `POST /api/profiles` - Add new profile (verifies via platform API)
- `DELETE /api/profiles/:platform` - Remove profile
- `POST /api/profiles/verify` - Re-verify all connected profiles

## Usage

1. **Sign up** at http://localhost:5173/signup
2. **Log in** with your credentials
3. **Dashboard** - View your account and connected profiles
4. **Profiles** - Add a profile by pasting a URL:
   - Codeforces: `https://codeforces.com/profile/<username>`
   - LeetCode: `https://leetcode.com/u/<username>/`
   - CodeChef: `https://www.codechef.com/users/<username>`
5. The system will detect the platform, extract the username, and verify the profile exists
6. Connected profiles are displayed on both Dashboard and Profiles pages
7. Remove profiles using the "Remove" button

## Platform Support

### ✅ Codeforces (Fully Implemented)
- Profile verification via API
- Rate limiting (1 request per 2 seconds)
- Retry logic with exponential backoff
- Fetches: user info, submissions, contests, problems

### 🚧 LeetCode (Adapter Interface Ready)
- URL parsing and username extraction implemented
- Adapter implementation pending

### 🚧 CodeChef (Adapter Interface Ready)
- URL parsing and username extraction implemented
- Adapter implementation pending

## Testing

Run the test suite:
```bash
npm test
```

Tests cover:
- URL parsing for all three platforms
- Platform detection
- Username extraction
- Codeforces API mapper
- Authentication logic
- Database initialization

## Security Features

- Passwords hashed with bcrypt
- JWT tokens stored in httpOnly, secure cookies
- CSRF protection with sameSite cookie settings
- Helmet.js for security headers
- CORS configured for specific origins
- Rate limiting on all API endpoints
- Input validation with Zod schemas
- SQL injection prevention with prepared statements

## Development Notes

- Server auto-restarts on file changes (tsx watch)
- Client has HMR enabled (Vite)
- TypeScript strict mode enabled
- Database migrations run automatically
- All business logic (auth, adapters, profiles, db) preserved from CLI version

## License

ISC
