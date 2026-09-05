import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, getErrorMessage } from '../../lib/api';

interface Problem {
  id: string;
  title: string;
  url: string | null;
  difficulty: string | null;
  rating: number | null;
  topics: string[];
}

interface RoadmapWeek {
  weekNumber: number;
  topic: string;
  focus: string;
  targetRatingMin: number;
  targetRatingMax: number;
  problems: Problem[];
  reason: string;
  isDecayRecovery: boolean;
  currentScore: number;
  targetScore: number;
}

interface Roadmap {
  weeks: RoadmapWeek[];
  totalTopics: number;
  estimatedWeeks: number;
  summary: string;
}

const FOCUS_COLOR: Record<string, string> = {
  'Urgent Revision':     'bg-red-100 text-red-700 border-red-200',
  'Skill Recovery':      'bg-orange-100 text-orange-700 border-orange-200',
  'Refresher Practice':  'bg-yellow-100 text-yellow-700 border-yellow-200',
  'Foundation Building': 'bg-blue-100 text-blue-700 border-blue-200',
  'Core Strengthening':  'bg-indigo-100 text-indigo-700 border-indigo-200',
  'Skill Advancement':   'bg-green-100 text-green-700 border-green-200'
};

export function Roadmap() {
  const [weeks, setWeeks] = useState(8);
  const [expanded, setExpanded] = useState<Set<number>>(new Set([1]));

  const { data, isLoading, error } = useQuery({
    queryKey: ['recommendations', 'roadmap', weeks],
    queryFn: async () => {
      const res = await api.get<Roadmap>(`/recommendations/roadmap?weeks=${weeks}`);
      return res.data;
    }
  });

  const toggleWeek = (n: number) =>
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(n) ? next.delete(n) : next.add(n);
      return next;
    });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-gray-500 text-sm">Building your roadmap…</p>
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

  if (!data || data.weeks.length === 0) {
    return (
      <div className="text-center py-16 px-4">
        <div className="text-5xl mb-4">🗺️</div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">No roadmap yet</h3>
        <p className="text-sm text-gray-500 max-w-sm mx-auto">
          Sync your profile to generate a personalised week-by-week practice roadmap.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Practice Roadmap</h2>
          {data.summary && (
            <p className="mt-1 text-sm text-gray-500">{data.summary}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="weeks-select" className="text-sm text-gray-600 whitespace-nowrap">
            Plan length:
          </label>
          <select
            id="weeks-select"
            value={weeks}
            onChange={e => setWeeks(Number(e.target.value))}
            className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {[4, 6, 8, 10, 12, 16].map(n => (
              <option key={n} value={n}>{n} weeks</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-indigo-600">{data.weeks.length}</div>
          <div className="text-xs text-gray-500 mt-1">Weeks planned</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-indigo-600">{data.totalTopics}</div>
          <div className="text-xs text-gray-500 mt-1">Topics identified</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-indigo-600">{data.estimatedWeeks}</div>
          <div className="text-xs text-gray-500 mt-1">Est. weeks to completion</div>
        </div>
      </div>

      <div className="relative">
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" aria-hidden="true" />

        <div className="space-y-4">
          {data.weeks.map(week => {
            const isOpen = expanded.has(week.weekNumber);
            const focusCls = FOCUS_COLOR[week.focus] ?? 'bg-gray-100 text-gray-700 border-gray-200';

            return (
              <div key={week.weekNumber} className="relative pl-14">
                <div className="absolute left-4 top-4 w-5 h-5 rounded-full border-2 border-white bg-indigo-500 shadow flex items-center justify-center">
                  <span className="text-white text-xs font-bold leading-none">{week.weekNumber}</span>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                  <button
                    className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors"
                    onClick={() => toggleWeek(week.weekNumber)}
                  >
                    <div className="flex flex-wrap items-center gap-3 min-w-0">
                      <h3 className="font-semibold text-gray-900">{week.topic}</h3>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${focusCls}`}>
                        {week.isDecayRecovery && '⚠️ '}{week.focus}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="hidden sm:flex items-center gap-1">
                        <span className="text-xs text-gray-400">Score:</span>
                        <span className="text-xs font-semibold text-gray-700">
                          {week.currentScore} → {week.targetScore}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400">
                        {week.targetRatingMin}–{week.targetRatingMax} rating
                      </div>
                      <svg
                        className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-gray-100 px-5 py-4 space-y-4">
                      <p className="text-sm text-gray-600">{week.reason}</p>

                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500">Progress target:</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-2 max-w-xs">
                          <div
                            className="bg-indigo-500 h-2 rounded-full"
                            style={{ width: `${week.currentScore}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{week.currentScore} / 100</span>
                      </div>

                      {week.problems.length > 0 ? (
                        <div>
                          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                            Practice problems ({week.problems.length})
                          </h4>
                          <ul className="space-y-2">
                            {week.problems.map(p => (
                              <li key={p.id} className="flex items-center justify-between gap-3 text-sm py-2 border-b border-gray-50 last:border-0">
                                <div className="flex items-center gap-2 min-w-0">
                                  {p.difficulty && (
                                    <span className={`text-xs font-medium flex-shrink-0 ${
                                      p.difficulty === 'Easy' ? 'text-green-600' :
                                      p.difficulty === 'Medium' ? 'text-yellow-600' : 'text-red-600'
                                    }`}>
                                      {p.difficulty}
                                    </span>
                                  )}
                                  {p.rating && (
                                    <span className="text-xs text-gray-400 flex-shrink-0">{p.rating}</span>
                                  )}
                                  <span className="text-gray-800 truncate">{p.title}</span>
                                </div>
                                {p.url && (
                                  <a
                                    href={p.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-shrink-0 text-xs text-indigo-600 hover:text-indigo-800 hover:underline"
                                  >
                                    Solve →
                                  </a>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400 italic">No unsolved problems found for this topic at the target difficulty.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
