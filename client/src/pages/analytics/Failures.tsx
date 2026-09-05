import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { api, getErrorMessage } from '../../lib/api';
import { ExplainPanel } from '../../components/ai/ExplainPanel';

interface FailurePattern {
  topic: string;
  failureType: string;
  frequency: number;
  severity: number;
  description: string;
  firstDetected: string;
  lastDetected: string;
}

interface FailureBreakdown {
  verdictDistribution: Record<string, number>;
  patterns: FailurePattern[];
  topicFailures: Record<string, number>;
}

const COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'];

export function Failures() {
  const [data, setData] = useState<FailureBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchFailures();
  }, []);

  const fetchFailures = async () => {
    try {
      setLoading(true);
      const response = await api.get<FailureBreakdown>('/analytics/failures');
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
        <div className="text-gray-600">Loading failure analysis...</div>
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

  if (!data || (Object.keys(data.verdictDistribution).length === 0 && data.patterns.length === 0)) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No failures to analyze</h3>
        <p className="mt-1 text-sm text-gray-500">Perfect record! Keep up the great work.</p>
      </div>
    );
  }

  const verdictChartData = Object.entries(data.verdictDistribution).map(([verdict, count]) => ({
    name: verdict,
    value: count
  }));

  const topicFailureData = Object.entries(data.topicFailures)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([topic, count]) => ({
      topic: topic.length > 15 ? topic.substring(0, 15) + '...' : topic,
      failures: count
    }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Failure Analysis</h2>
        <p className="mt-1 text-sm text-gray-600">
          Understanding your failure patterns to improve problem-solving
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Verdict Distribution</h3>
          {verdictChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={verdictChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {verdictChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-500">No verdict data available</p>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Top Failing Topics</h3>
          {topicFailureData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topicFailureData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="topic" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="failures" fill="#EF4444" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-500">No topic failure data available</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Failure DNA - Detected Patterns</h3>
          <p className="mt-1 text-sm text-gray-600">
            Recurring failure patterns identified by AI analysis
          </p>
        </div>
        {data.patterns.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {data.patterns.map((pattern, index) => (
              <li key={index} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-sm font-semibold text-gray-900">{pattern.topic}</h4>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        pattern.severity >= 7 ? 'bg-red-100 text-red-800' :
                        pattern.severity >= 5 ? 'bg-orange-100 text-orange-800' :
                        pattern.severity >= 3 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        Severity: {pattern.severity.toFixed(1)}
                      </span>
                    </div>
                    <div className="mb-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                        {pattern.failureType}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{pattern.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Frequency: {pattern.frequency}x</span>
                      <span>First: {new Date(pattern.firstDetected).toLocaleDateString()}</span>
                      <span>Last: {new Date(pattern.lastDetected).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-6 py-8 text-center text-gray-500">
            No recurring patterns detected yet
          </div>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-amber-800">How to address failures</h3>
            <div className="mt-2 text-sm text-amber-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Review the failure patterns and understand the root causes</li>
                <li>Focus on topics with high severity patterns first</li>
                <li>Practice similar problems to break recurring patterns</li>
                <li>Take time to understand concepts before attempting harder problems</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <ExplainPanel
        endpoint="/explain/failures"
        label="Failures"
        queryKey={['explain', 'failures']}
      />
    </div>
  );
}
