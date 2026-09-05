import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '../../lib/api';

interface Problem {
  id: string;
  platform: string;
  external_id: string;
  title: string;
  url: string | null;
  difficulty: string | null;
  rating: number | null;
  topics: string[];
}

interface Recommendation {
  id: string;
  problemId: string;
  problem: Problem;
  reason: string;
  priority: number;
  createdAt: string;
  completedAt: string | null;
  source: 'weakness' | 'failure' | 'decay' | 'new-topic';
}

const SOURCE_META: Record<Recommendation['source'], { label: string; color: string; icon: string }> = {
  weakness: { label: 'Weak area', color: 'bg-orange-100 text-orange-700', icon: '⚠️' },
  failure: { label: 'Failure pattern', color: 'bg-red-100 text-red-700', icon: '🔁' },
  decay: { label: 'Skill decay', color: 'bg-yellow-100 text-yellow-700', icon: '📉' },
  'new-topic': { label: 'New topic', color: 'bg-blue-100 text-blue-700', icon: '🆕' }
};

const DIFFICULTY_COLOR: Record<string, string> = {
  Easy: 'text-green-600',
  Medium: 'text-yellow-600',
  Hard: 'text-red-600',
  'Very Hard': 'text-red-800',
  Expert: 'text-purple-700'
};

function ratingToDifficulty(rating: number | null): string {
  if (!rating) return 'Unknown';
  if (rating < 1200) return 'Easy';
  if (rating < 1600) return 'Medium';
  if (rating < 2000) return 'Hard';
  if (rating < 2400) return 'Very Hard';
  return 'Expert';
}

export function NextProblems() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['recommendations', 'next'],
    queryFn: async () => {
      const res = await api.get<{ recommendations: Recommendation[] }>('/recommendations/next');
      return res.data;
    }
  });

  const dismissMutation = useMutation({
    mutationFn: (id: string) => api.post(`/recommendations/${id}/dismiss`),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['recommendations', 'next'] });
      const previous = queryClient.getQueryData<{ recommendations: Recommendation[] }>(['recommendations', 'next']);
      queryClient.setQueryData<{ recommendations: Recommendation[] }>(
        ['recommendations', 'next'],
        old => old
          ? { recommendations: old.recommendations.filter(r => r.id !== id) }
          : old
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['recommendations', 'next'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['recommendations', 'next'] });
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-gray-500 text-sm">Loading recommendations…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 border border-red-200 p-4">
        <p className="text-sm text-red-700">{getErrorMessage(error)}</p>
      </div>
    );
  }

  const recommendations = data?.recommendations ?? [];

  if (recommendations.length === 0) {
    return (
      <div className="text-center py-16 px-4">
        <div className="text-5xl mb-4">🎯</div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">No recommendations yet</h3>
        <p className="text-sm text-gray-500 max-w-sm mx-auto">
          Sync your profile so AlgoPulse can analyse your submissions and generate personalised recommendations.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Next Problems</h2>
        <span className="text-sm text-gray-500">{recommendations.length} recommendation{recommendations.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {recommendations.map(rec => {
          const displayDifficulty = rec.problem.difficulty ?? ratingToDifficulty(rec.problem.rating);
          const diffClass = DIFFICULTY_COLOR[displayDifficulty] ?? 'text-gray-600';
          const source = SOURCE_META[rec.source] ?? SOURCE_META.weakness;

          return (
            <div key={rec.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${source.color}`}>
                      {source.icon} {source.label}
                    </span>
                    <span className={`text-xs font-semibold ${diffClass}`}>
                      {displayDifficulty}{rec.problem.rating ? ` · ${rec.problem.rating}` : ''}
                    </span>
                    <span className="text-xs text-gray-400 capitalize">{rec.problem.platform}</span>
                  </div>

                  <h3 className="text-base font-semibold text-gray-900 mb-1 truncate">
                    {rec.problem.url ? (
                      <a
                        href={rec.problem.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-indigo-600 hover:underline"
                      >
                        {rec.problem.title}
                      </a>
                    ) : (
                      rec.problem.title
                    )}
                  </h3>

                  <p className="text-sm text-gray-600 mb-3">{rec.reason}</p>

                  {rec.problem.topics.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {rec.problem.topics.map(t => (
                        <span key={t} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <div className="text-right">
                    <div className="text-xs text-gray-400 mb-0.5">Priority</div>
                    <div className="text-lg font-bold text-indigo-600">{rec.priority}</div>
                  </div>
                  <button
                    onClick={() => dismissMutation.mutate(rec.id)}
                    disabled={dismissMutation.isPending}
                    className="px-3 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 transition-colors"
                    title="Dismiss this recommendation"
                  >
                    Dismiss
                  </button>
                  {rec.problem.url && (
                    <a
                      href={rec.problem.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      Solve →
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
