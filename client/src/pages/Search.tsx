import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Navbar } from '../components/Navbar';
import { FindSimilarModal } from '../components/ai/FindSimilarModal';
import { api, getErrorMessage } from '../lib/api';
import { useHealth } from '../lib/useHealth';

interface SearchResult {
  problemId: string;
  platform: string;
  title: string;
  topics: string[];
  difficulty: string | null;
  rating: number | null;
  score: number;
  url: string | null;
}

const DIFFICULTY_COLOR: Record<string, string> = {
  Easy: 'text-green-600 bg-green-50',
  Medium: 'text-yellow-700 bg-yellow-50',
  Hard: 'text-red-600 bg-red-50',
  'Very Hard': 'text-red-800 bg-red-100',
  Expert: 'text-purple-700 bg-purple-50'
};

const PLATFORM_ICON: Record<string, string> = {
  codeforces: '⚡',
  leetcode: '🧩',
  codechef: '👨‍🍳'
};

export function Search() {
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [similarProblemId, setSimilarProblemId] = useState<string | null>(null);
  const [similarProblemTitle, setSimilarProblemTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: health } = useHealth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['search', submittedQuery],
    queryFn: async () => {
      const res = await api.get<{ results: SearchResult[]; query: string; message?: string }>(
        `/search?q=${encodeURIComponent(submittedQuery)}`
      );
      return res.data;
    },
    enabled: submittedQuery.trim().length > 0
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) setSubmittedQuery(query.trim());
  };

  const EXAMPLE_QUERIES = [
    'graph problems with DSU',
    'binary search on answer',
    'dynamic programming on trees',
    'sliding window with hash map',
    'segment tree range queries'
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Semantic Search</h1>
          <p className="mt-1 text-sm text-gray-500">
            Describe what you want to practice in plain English — powered by vector embeddings.
          </p>
          {health && (!health.mongoConfigured || !health.aiConfigured) && (
            <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
              ⚠️ {!health.mongoConfigured && 'MongoDB Atlas is not configured (MONGODB_URI missing). '}
              {!health.aiConfigured && 'Gemini AI is not configured (GEMINI_API_KEY missing). '}
              Search will not return results until these are set up.
            </div>
          )}
        </div>

        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="e.g. graph problems with DSU, binary search on answer, DP on intervals…"
              className="flex-1 px-4 py-3 text-sm border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              autoFocus
            />
            <button
              type="submit"
              disabled={!query.trim() || isLoading}
              className="px-6 py-3 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {isLoading ? 'Searching…' : 'Search'}
            </button>
          </div>
        </form>

        {!submittedQuery && (
          <div className="mb-8">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Try these searches</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_QUERIES.map(q => (
                <button
                  key={q}
                  onClick={() => { setQuery(q); setSubmittedQuery(q); }}
                  className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-full text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition-colors shadow-sm"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 mb-6">
            <p className="text-sm text-red-700">{getErrorMessage(error)}</p>
          </div>
        )}

        {data?.message && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 mb-6">
            <p className="text-sm text-amber-700">⚠️ {data.message}</p>
          </div>
        )}

        {isLoading && (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-white rounded-xl border border-gray-200 animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && data && (
          <div className="space-y-3">
            {data.results.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-4xl mb-3">🔍</div>
                <p className="text-gray-600 font-medium">No results found for "{data.query}"</p>
                <p className="text-sm text-gray-400 mt-1">Try a different description or broader terms.</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-400 mb-4">
                  {data.results.length} result{data.results.length !== 1 ? 's' : ''} for "{data.query}"
                </p>
                {data.results.map(result => (
                  <ProblemCard
                    key={result.problemId}
                    result={result}
                    onFindSimilar={(id, title) => {
                      setSimilarProblemId(id);
                      setSimilarProblemTitle(title);
                    }}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {similarProblemId && (
        <FindSimilarModal
          problemId={similarProblemId}
          problemTitle={similarProblemTitle}
          onClose={() => setSimilarProblemId(null)}
        />
      )}
    </div>
  );
}

function ProblemCard({
  result,
  onFindSimilar
}: {
  result: SearchResult;
  onFindSimilar: (id: string, title: string) => void;
}) {
  const diffClass = DIFFICULTY_COLOR[result.difficulty ?? ''] ?? 'text-gray-600 bg-gray-50';
  const icon = PLATFORM_ICON[result.platform] ?? '💻';

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-xs text-gray-500">{icon} {result.platform}</span>
            {result.difficulty && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${diffClass}`}>
                {result.difficulty}
              </span>
            )}
            {result.rating && (
              <span className="text-xs text-gray-400">Rating {result.rating}</span>
            )}
            <span className="ml-auto text-xs text-gray-400">
              {(result.score * 100).toFixed(0)}% match
            </span>
          </div>

          <h3 className="text-sm font-semibold text-gray-900 truncate mb-2">
            {result.url ? (
              <a href={result.url} target="_blank" rel="noopener noreferrer"
                className="hover:text-indigo-600 hover:underline">
                {result.title}
              </a>
            ) : result.title}
          </h3>

          {result.topics.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {result.topics.slice(0, 5).map(t => (
                <span key={t} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs">{t}</span>
              ))}
              {result.topics.length > 5 && (
                <span className="text-xs text-gray-400">+{result.topics.length - 5} more</span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 flex-shrink-0">
          {result.url && (
            <a href={result.url} target="_blank" rel="noopener noreferrer"
              className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">
              Solve →
            </a>
          )}
          <button
            onClick={() => onFindSimilar(result.problemId, result.title)}
            className="px-3 py-1.5 text-xs text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors">
            Find similar
          </button>
        </div>
      </div>
    </div>
  );
}
