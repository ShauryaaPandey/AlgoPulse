import { useQuery } from '@tanstack/react-query';
import { api, getErrorMessage } from '../../lib/api';

interface SimilarResult {
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
  Easy: 'text-green-600',
  Medium: 'text-yellow-700',
  Hard: 'text-red-600',
  'Very Hard': 'text-red-800',
  Expert: 'text-purple-700'
};

const PLATFORM_ICON: Record<string, string> = {
  codeforces: '⚡',
  leetcode: '🧩',
  codechef: '👨‍🍳'
};

interface Props {
  problemId: string;
  problemTitle: string;
  onClose: () => void;
}

export function FindSimilarModal({ problemId, problemTitle, onClose }: Props) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['similar', problemId],
    queryFn: async () => {
      const res = await api.get<{ results: SimilarResult[]; problemId: string; message?: string }>(
        `/problems/${problemId}/similar`
      );
      return res.data;
    }
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-900">Similar problems</h2>
            <p className="text-xs text-gray-500 truncate mt-0.5">Based on: {problemTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 ml-4 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {data?.message && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 mb-4">
              <p className="text-sm text-amber-700">⚠️ {data.message}</p>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 mb-4">
              <p className="text-sm text-red-700">{getErrorMessage(error)}</p>
            </div>
          )}

          {isLoading && (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          )}

          {!isLoading && data?.results.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-sm">No similar problems found.</p>
              <p className="text-gray-400 text-xs mt-1">This problem may not be indexed yet.</p>
            </div>
          )}

          {!isLoading && data && data.results.length > 0 && (
            <div className="space-y-2">
              {data.results.map(r => {
                const icon = PLATFORM_ICON[r.platform] ?? '💻';
                const diffClass = DIFFICULTY_COLOR[r.difficulty ?? ''] ?? 'text-gray-500';

                return (
                  <div key={r.problemId}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-gray-400">{icon}</span>
                        {r.difficulty && (
                          <span className={`text-xs font-medium ${diffClass}`}>{r.difficulty}</span>
                        )}
                        {r.rating && <span className="text-xs text-gray-400">{r.rating}</span>}
                      </div>
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {r.url ? (
                          <a href={r.url} target="_blank" rel="noopener noreferrer"
                            className="hover:text-indigo-600 hover:underline">{r.title}</a>
                        ) : r.title}
                      </p>
                      {r.topics.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {r.topics.slice(0, 4).map(t => (
                            <span key={t} className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0 flex flex-col items-end gap-1">
                      <span className="text-xs text-gray-400">{(r.score * 100).toFixed(0)}%</span>
                      {r.url && (
                        <a href={r.url} target="_blank" rel="noopener noreferrer"
                          className="text-xs px-2.5 py-1 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">
                          Solve →
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
