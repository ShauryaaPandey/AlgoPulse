import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Navbar } from '../components/Navbar';
import { api, getErrorMessage } from '../lib/api';

interface PrepArea {
  topic: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  trendWeight: number;
  userSkillScore: number;
  gapScore: number;
}

interface ReadinessScore {
  total: number;
  breakdown: {
    topicCoverage: number;
    difficultyCoverage: number;
    recentConsistency: number;
    weaknessSeverity: number;
    failureRate: number;
    trendAlignment: number;
  };
}

interface InterviewPrepResult {
  company: string;
  companyNotes: string;
  preparationAreas: PrepArea[];
  readiness: ReadinessScore;
  knownCompanies: string[];
  disclaimer: string;
}

const PRIORITY_META: Record<PrepArea['priority'], { label: string; color: string; bar: string }> = {
  critical: { label: 'Critical gap', color: 'text-red-700 bg-red-50 border-red-200', bar: 'bg-red-500' },
  high:     { label: 'High gap',     color: 'text-orange-700 bg-orange-50 border-orange-200', bar: 'bg-orange-400' },
  medium:   { label: 'Medium gap',   color: 'text-yellow-700 bg-yellow-50 border-yellow-200', bar: 'bg-yellow-400' },
  low:      { label: 'Good',         color: 'text-green-700 bg-green-50 border-green-200', bar: 'bg-green-500' }
};

const BREAKDOWN_LABELS: Record<string, { label: string; weight: string }> = {
  topicCoverage:     { label: 'Topic Coverage',      weight: '25%' },
  difficultyCoverage:{ label: 'Difficulty Coverage', weight: '15%' },
  recentConsistency: { label: 'Recent Consistency',  weight: '15%' },
  weaknessSeverity:  { label: 'Weakness Severity',   weight: '20%' },
  failureRate:       { label: 'Success Rate',         weight: '10%' },
  trendAlignment:    { label: 'Trend Alignment',      weight: '15%' }
};

function GaugeBar({ value }: { value: number }) {
  const color = value >= 70 ? 'bg-green-500' : value >= 45 ? 'bg-yellow-400' : 'bg-red-500';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-2xl font-bold text-gray-900 w-12 text-right">{value}</span>
    </div>
  );
}

export function InterviewPrep() {
  const [companyInput, setCompanyInput] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['interview', selectedCompany || 'Generic'],
    queryFn: async () => {
      const param = selectedCompany.trim() ? `?company=${encodeURIComponent(selectedCompany.trim())}` : '';
      const res = await api.get<InterviewPrepResult>(`/interview${param}`);
      return res.data;
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSelectedCompany(companyInput.trim());
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Interview Prep</h1>
          <p className="mt-1 text-sm text-gray-500">
            See how prepared you are and which topics to focus on based on your skill profile.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <div className="flex-1">
              <label htmlFor="company" className="block text-xs font-medium text-gray-600 mb-1">
                Target Company (optional)
              </label>
              <input
                id="company"
                type="text"
                value={companyInput}
                onChange={e => setCompanyInput(e.target.value)}
                placeholder="Google, Meta, Amazon, Microsoft, Stripe…"
                list="companies-list"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {data && (
                <datalist id="companies-list">
                  {data.knownCompanies.map(c => <option key={c} value={c} />)}
                </datalist>
              )}
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Analyse
              </button>
            </div>
          </form>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 mb-6">
            <p className="text-sm text-red-700">{getErrorMessage(error)}</p>
          </div>
        )}

        {isLoading && (
          <div className="space-y-4">
            <div className="h-40 bg-white rounded-xl border border-gray-200 animate-pulse" />
            <div className="h-64 bg-white rounded-xl border border-gray-200 animate-pulse" />
          </div>
        )}

        {!isLoading && data && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Preparation Readiness — {data.company}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">{data.companyNotes}</p>
                </div>
                <div className="text-right">
                  <div className={`text-3xl font-bold ${
                    data.readiness.total >= 70 ? 'text-green-600' :
                    data.readiness.total >= 45 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {data.readiness.total}<span className="text-base font-medium text-gray-500">/100</span>
                  </div>
                </div>
              </div>

              <GaugeBar value={data.readiness.total} />

              <p className="mt-3 text-xs text-gray-400 italic border-t border-gray-100 pt-3">
                ⚠️ {data.disclaimer}
              </p>

              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(data.readiness.breakdown).map(([key, value]) => {
                  const meta = BREAKDOWN_LABELS[key];
                  if (!meta) return null;
                  return (
                    <div key={key} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500">{meta.label}</span>
                        <span className="text-xs text-gray-400">{meta.weight}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${value >= 70 ? 'bg-green-500' : value >= 45 ? 'bg-yellow-400' : 'bg-red-500'}`}
                            style={{ width: `${value}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-gray-700">{value}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-base font-semibold text-gray-900">Preparation Areas</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Ranked by gap between {data.company}'s topic emphasis and your current skill.
                </p>
              </div>

              <div className="divide-y divide-gray-50">
                {data.preparationAreas.map(area => {
                  const meta = PRIORITY_META[area.priority];
                  return (
                    <div key={area.topic} className="px-5 py-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium text-gray-900">{area.topic}</span>
                            <span className={`px-2 py-0.5 text-xs rounded-full border font-medium ${meta.color}`}>
                              {meta.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>Your skill: <strong className="text-gray-700">{area.userSkillScore}/100</strong></span>
                            <span>Company emphasis: <strong className="text-gray-700">{Math.round(area.trendWeight * 100)}%</strong></span>
                          </div>
                          <div className="mt-2 flex gap-2 items-center">
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${meta.bar}`}
                                style={{ width: `${Math.min(100, area.gapScore * 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-400 w-16 text-right">
                              gap {(area.gapScore * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
