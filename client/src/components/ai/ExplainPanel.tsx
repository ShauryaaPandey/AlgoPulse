import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, getErrorMessage } from '../../lib/api';

interface Insight {
  summary: string;
  keyReasons: string[];
  recommendations: string[];
  [key: string]: unknown;
}

interface Props {
  endpoint: string;
  label: string;
  queryKey: string[];
}

export function ExplainPanel({ endpoint, label, queryKey }: Props) {
  const [enabled, setEnabled] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await api.get<Insight | { error: string }>(endpoint);
      return res.data;
    },
    enabled,
    staleTime: 5 * 60 * 1000
  });

  if (!enabled) {
    return (
      <div className="mt-4 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/40 p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-indigo-800">✨ AI Explanation</p>
          <p className="text-xs text-indigo-600 mt-0.5">
            Get a plain-English explanation of your {label.toLowerCase()} analytics.
          </p>
        </div>
        <button
          onClick={() => setEnabled(true)}
          className="flex-shrink-0 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Explain with AI
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50/40 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-5 h-5 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
          <p className="text-sm text-indigo-700 font-medium">Generating AI explanation…</p>
        </div>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className={`h-3 bg-indigo-100 rounded animate-pulse`} style={{ width: `${75 - i * 15}%` }} />
          ))}
        </div>
      </div>
    );
  }

  if (error || (data && 'error' in data)) {
    const msg = error ? getErrorMessage(error) : (data as { error: string }).error;
    return (
      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-medium text-amber-800 mb-1">AI Explanation unavailable</p>
        <p className="text-xs text-amber-700">{msg}</p>
        <button
          onClick={() => setEnabled(false)}
          className="mt-2 text-xs text-amber-600 underline"
        >
          Dismiss
        </button>
      </div>
    );
  }

  if (!data) return null;

  const insight = data as Insight;

  return (
    <div className="mt-4 rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">✨</span>
          <h3 className="text-sm font-semibold text-indigo-900">AI Explanation — {label}</h3>
        </div>
        <button
          onClick={() => setEnabled(false)}
          className="text-xs text-gray-400 hover:text-gray-600"
          aria-label="Close explanation"
        >
          ✕
        </button>
      </div>

      <p className="text-sm text-gray-800 leading-relaxed">{insight.summary}</p>

      {insight.keyReasons.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-2">Key Reasons</h4>
          <ul className="space-y-1.5">
            {insight.keyReasons.map((reason, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="mt-0.5 text-indigo-400 flex-shrink-0">•</span>
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {insight.recommendations.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-2">Recommendations</h4>
          <ul className="space-y-1.5">
            {insight.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="mt-0.5 text-green-500 flex-shrink-0">→</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-gray-400 pt-1 border-t border-indigo-100">
        Powered by Google Gemini · Explanations are based on your computed analytics only.
      </p>
    </div>
  );
}
