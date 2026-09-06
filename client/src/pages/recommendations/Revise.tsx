import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '../../lib/api';

interface Problem {
  id: string;
  title: string;
  url: string | null;
  difficulty: string | null;
  rating: number | null;
  topics: string[];
}

interface RevisionItem {
  problem: Problem;
  topic: string;
  failureType: string;
  failureDescription: string;
  failureSeverity: number;
  lastFailedAt: string;
  failureCount: number;
  daysSinceLastAttempt: number;
  recommendedBecause: string;
  wasRecommendedBefore: boolean;
  lastRecommendedAt: string | null;
}

interface RevisionGroup {
  topic: string;
  failureType: string;
  failureDescription: string;
  items: RevisionItem[];
}

interface RevisionPlan {
  groups: RevisionGroup[];
  totalItems: number;
}

const FAILURE_TYPE_ICON: Record<string, string> = {
  'boundary-errors':      '🔢',
  'dp-state-errors':      '🔄',
  'graph-logic-errors':   '🕸️',
  'logic-errors':         '🧠',
  'array-bounds':         '📏',
  'null-pointer':         '💣',
  'runtime-error':        '💥',
  'inefficient-algorithm':'⏱️',
  'optimization-needed':  '⚡',
  'memory-inefficient':   '💾',
  'syntax-errors':        '📝'
};

function formatDaysAgo(days: number): string {
  if (days === 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months > 1 ? 's' : ''} ago`;
}

export function Revise() {
  const queryClient = useQueryClient();
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  const { data, isLoading, error } = useQuery({
    queryKey: ['recommendations', 'revise'],
    queryFn: async () => {
      const res = await api.get<RevisionPlan>('/recommendations/revise');
      return res.data;
    },
    select: d => {
      if (d.groups.length > 0 && openGroups.size === 0) {
        const first = d.groups[0];
        if (first) {
          setOpenGroups(new Set([`${first.topic}::${first.failureType}`]));
        }
      }
      return d;
    }
  });

  const dismissMutation = useMutation({
    mutationFn: (problemId: string) =>
      api.post(`/recommendations/${problemId}/dismiss`),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['recommendations', 'revise'] });
    }
  });

  const toggleGroup = (key: string) =>
    setOpenGroups(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-gray-500 text-sm">Finding problems to revise…</p>
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

  if (!data || data.groups.length === 0) {
    return (
      <div className="text-center py-16 px-4">
        <div className="text-5xl mb-4">✅</div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Nothing to revise</h3>
        <p className="text-sm text-gray-500 max-w-sm mx-auto">
          No recurring failure patterns detected. Keep practising and sync regularly to track your progress.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Revision List</h2>
          <p className="mt-1 text-sm text-gray-500">
            Problems you've failed with recurring patterns — worth revisiting.
          </p>
        </div>
        <span className="text-sm text-gray-500">
          {data.totalItems} problem{data.totalItems !== 1 ? 's' : ''} across {data.groups.length} pattern{data.groups.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-4">
        {data.groups.map(group => {
          const key = `${group.topic}::${group.failureType}`;
          const isOpen = openGroups.has(key);
          const icon = FAILURE_TYPE_ICON[group.failureType] ?? '❌';

          return (
            <div key={key} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <button
                className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors"
                onClick={() => toggleGroup(key)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{group.topic}</h3>
                      <span className="px-2 py-0.5 bg-red-50 text-red-700 rounded-full text-xs font-medium">
                        {group.failureType.replace(/-/g, ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{group.failureDescription}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs text-gray-400">{group.items.length} problem{group.items.length !== 1 ? 's' : ''}</span>
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-gray-100">
                  {group.items.map(item => (
                    <div
                      key={item.problem.id}
                      className="px-5 py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            {item.problem.difficulty && (
                              <span className={`text-xs font-medium ${
                                item.problem.difficulty === 'Easy' ? 'text-green-600' :
                                item.problem.difficulty === 'Medium' ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {item.problem.difficulty}
                              </span>
                            )}
                            {item.problem.rating && (
                              <span className="text-xs text-gray-400">{item.problem.rating}</span>
                            )}
                            {item.wasRecommendedBefore && (
                              <span className="px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded text-xs">
                                Recommended before
                              </span>
                            )}
                          </div>

                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {item.problem.url ? (
                              <a
                                href={item.problem.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-indigo-600 hover:underline"
                              >
                                {item.problem.title}
                              </a>
                            ) : (
                              item.problem.title
                            )}
                          </h4>

                          <p className="text-xs text-gray-500 mt-1">{item.recommendedBecause}</p>

                          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-400">
                            <span>Last failed: {formatDaysAgo(item.daysSinceLastAttempt)}</span>
                            <span>Failed {item.failureCount}×</span>
                            <span>Severity: {item.failureSeverity.toFixed(1)}/10</span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          {item.problem.url && (
                            <a
                              href={item.problem.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                              Retry →
                            </a>
                          )}
                          <button
                            onClick={() => dismissMutation.mutate(item.problem.id)}
                            disabled={dismissMutation.isPending}
                            className="px-3 py-1.5 text-xs text-gray-400 border border-gray-200 rounded-lg hover:text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                          >
                            Skip
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
