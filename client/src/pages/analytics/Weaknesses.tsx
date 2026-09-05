import { useState, useEffect } from 'react';
import { api, getErrorMessage } from '../../lib/api';

interface Weakness {
  topic: string;
  weaknessScore: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  skillScore: number;
  failureRate: number;
  avgAttempts: number;
  problemCount: number;
}

export function Weaknesses() {
  const [weaknesses, setWeaknesses] = useState<Weakness[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchWeaknesses();
  }, []);

  const fetchWeaknesses = async () => {
    try {
      setLoading(true);
      const response = await api.get<{ weaknesses: Weakness[] }>('/analytics/weaknesses');
      setWeaknesses(response.data.weaknesses);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '🔴';
      case 'high':
        return '🟠';
      case 'medium':
        return '🟡';
      case 'low':
        return '🟢';
      default:
        return '⚪';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading weaknesses data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <p className="text-sm text-red-800">{error}</p>
      </div>
    );
  }

  if (weaknesses.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No weaknesses detected</h3>
        <p className="mt-1 text-sm text-gray-500">Great job! Keep practicing to maintain your skills.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Topic Weaknesses</h2>
        <p className="mt-1 text-sm text-gray-600">
          Ranked by weakness score (higher = more urgent to address)
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {weaknesses.map((weakness) => (
          <div
            key={weakness.topic}
            className={`border-2 rounded-lg p-4 ${getSeverityColor(weakness.severity)}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{getSeverityIcon(weakness.severity)}</span>
                  <span className="text-xs font-semibold uppercase tracking-wide">
                    {weakness.severity}
                  </span>
                </div>
                <h3 className="text-lg font-semibold">{weakness.topic}</h3>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{weakness.weaknessScore.toFixed(1)}</div>
                <div className="text-xs">Weakness</div>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-700">Skill Score:</span>
                <span className="font-medium">{weakness.skillScore} / 100</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Failure Rate:</span>
                <span className="font-medium">{(weakness.failureRate * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Avg Attempts:</span>
                <span className="font-medium">{weakness.avgAttempts.toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Problems:</span>
                <span className="font-medium">{weakness.problemCount}</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-current border-opacity-20">
              <p className="text-xs text-gray-700">
                {weakness.severity === 'critical' && '⚠️ Urgent attention needed'}
                {weakness.severity === 'high' && '📌 High priority for practice'}
                {weakness.severity === 'medium' && '📝 Should be addressed soon'}
                {weakness.severity === 'low' && '✓ Minor area for improvement'}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">How to improve</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Focus on critical and high severity topics first</li>
                <li>Practice easier problems in weak areas to build confidence</li>
                <li>Review failed submissions to understand common mistakes</li>
                <li>Dedicate regular time to address identified weaknesses</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
