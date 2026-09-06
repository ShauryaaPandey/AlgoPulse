import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { api, getErrorMessage } from '../../lib/api';

interface ProblemIndexStats {
  index: string;
  totalAttempts: number;
  solvedCount: number;
  solveRate: number;
  avgAttempts: number;
  avgTime: number | null;
}

interface DecayWarning {
  topic: string;
  currentScore: number;
  historicalBestScore: number;
  scoreDrop: number;
  dropPercent: number;
  daysSinceLastPractice: number;
  lastPracticeDate: string;
  decaySeverity: 'critical' | 'high' | 'medium' | 'low';
  recommendAction: string;
}

interface ContestPerformance {
  indexStats: ProblemIndexStats[];
  totalContests: number;
  overallSolveRate: number;
  strengths: string[];
  weaknesses: string[];
  recentTrend: 'improving' | 'stable' | 'declining';
  decayWarnings: DecayWarning[];
}

export function Contests() {
  const [data, setData] = useState<ContestPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchContests();
  }, []);

  const fetchContests = async () => {
    try {
      setLoading(true);
      const response = await api.get<ContestPerformance>('/analytics/contests');
      setData(response.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading contest performance...</div>
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

  if (!data || data.indexStats.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No contest data</h3>
        <p className="mt-1 text-sm text-gray-500">Participate in contests to see your performance</p>
      </div>
    );
  }

  const solveRateData = data.indexStats.map(stat => ({
    index: `Problem ${stat.index}`,
    solveRate: stat.solveRate,
    attempts: stat.totalAttempts
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Contest Performance</h2>
        <p className="mt-1 text-sm text-gray-600">
          Analyze your performance across contest problems
        </p>
      </div>

      {data.decayWarnings && data.decayWarnings.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-800">⚠️ Skill Decay Warnings</h3>
              <div className="mt-2 text-sm text-red-700">
                <ul className="list-disc list-inside space-y-1">
                  {data.decayWarnings.map((warning, index) => (
                    <li key={index}>
                      <strong>{warning.topic}</strong>: {warning.recommendAction} (Score dropped {warning.scoreDrop.toFixed(1)} points, {warning.daysSinceLastPractice} days since practice)
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600">Total Contests</div>
          <div className="text-2xl font-bold text-gray-900">{data.totalContests}</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600">Overall Solve Rate</div>
          <div className="text-2xl font-bold text-indigo-600">{data.overallSolveRate}%</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600">Recent Trend</div>
          <div className={`text-lg font-bold ${
            data.recentTrend === 'improving' ? 'text-green-600' :
            data.recentTrend === 'declining' ? 'text-red-600' :
            'text-gray-600'
          }`}>
            {data.recentTrend === 'improving' ? '📈 Improving' :
             data.recentTrend === 'declining' ? '📉 Declining' :
             '➡️ Stable'}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600">Problems Attempted</div>
          <div className="text-2xl font-bold text-gray-900">
            {data.indexStats.reduce((sum, stat) => sum + stat.totalAttempts, 0)}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Solve Rate by Problem Index</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={solveRateData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="index" />
            <YAxis domain={[0, 100]} label={{ value: 'Solve Rate (%)', angle: -90, position: 'insideLeft' }} />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length > 0) {
                  const entry = payload[0];
                  if (!entry) return null;
                  return (
                    <div className="bg-white p-3 border border-gray-200 rounded shadow">
                      <p className="font-medium">{entry.payload.index}</p>
                      <p className="text-sm text-indigo-600">Solve Rate: {entry.value}%</p>
                      <p className="text-sm text-gray-600">Attempts: {entry.payload.attempts}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />
            <Bar dataKey="solveRate" fill="#4F46E5" name="Solve Rate (%)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {data.strengths.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">💪</span>
              <h3 className="text-lg font-medium text-green-900">Your Strengths</h3>
            </div>
            <ul className="space-y-2">
              {data.strengths.map((strength, index) => (
                <li key={index} className="flex items-center gap-2 text-sm text-green-800">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {strength}
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.weaknesses.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🎯</span>
              <h3 className="text-lg font-medium text-red-900">Areas to Improve</h3>
            </div>
            <ul className="space-y-2">
              {data.weaknesses.map((weakness, index) => (
                <li key={index} className="flex items-center gap-2 text-sm text-red-800">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {weakness}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Detailed Statistics</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Problem</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attempts</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Solved</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Solve Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Attempts</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Time</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.indexStats.map((stat) => (
                <tr key={stat.index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Problem {stat.index}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {stat.totalAttempts}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {stat.solvedCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      stat.solveRate >= 70 ? 'bg-green-100 text-green-800' :
                      stat.solveRate >= 40 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {stat.solveRate}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {stat.avgAttempts.toFixed(1)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {stat.avgTime !== null ? `${stat.avgTime}ms` : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
