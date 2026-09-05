import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { api, getErrorMessage } from '../../lib/api';
import { ExplainPanel } from '../../components/ai/ExplainPanel';

interface MonthlyScore {
  month: string;
  score: number;
}

interface TopicProgress {
  topic: string;
  currentScore: number;
  previousScore: number;
  change: number;
  changePercent: number;
  trend: 'improving' | 'stable' | 'regressing';
  monthlyData: MonthlyScore[];
}

interface ProgressSummary {
  topicProgress: TopicProgress[];
  biggestImprovement: string | null;
  biggestRegression: string | null;
  mostStable: string | null;
  slowImprovement: string[];
}

export function Progress() {
  const [data, setData] = useState<ProgressSummary | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    try {
      setLoading(true);
      const response = await api.get<ProgressSummary>('/analytics/progress');
      setData(response.data);
      if (response.data.topicProgress.length > 0) {
        setSelectedTopic(response.data.topicProgress[0].topic);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const getTrendBadge = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">📈 Improving</span>;
      case 'regressing':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">📉 Regressing</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">➡️ Stable</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading progress data...</div>
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

  if (!data || data.topicProgress.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No progress data</h3>
        <p className="mt-1 text-sm text-gray-500">Practice more to see your progress over time</p>
      </div>
    );
  }

  const selectedTopicData = data.topicProgress.find(t => t.topic === selectedTopic);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Skill Progress</h2>
        <p className="mt-1 text-sm text-gray-600">
          Track your improvement over time across different topics
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.biggestImprovement && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🏆</span>
              <h3 className="text-sm font-medium text-green-900">Biggest Improvement</h3>
            </div>
            <p className="text-lg font-semibold text-green-700">{data.biggestImprovement}</p>
          </div>
        )}

        {data.biggestRegression && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">⚠️</span>
              <h3 className="text-sm font-medium text-red-900">Biggest Regression</h3>
            </div>
            <p className="text-lg font-semibold text-red-700">{data.biggestRegression}</p>
          </div>
        )}

        {data.mostStable && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🎯</span>
              <h3 className="text-sm font-medium text-blue-900">Most Stable</h3>
            </div>
            <p className="text-lg font-semibold text-blue-700">{data.mostStable}</p>
          </div>
        )}

        {data.slowImprovement.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🐌</span>
              <h3 className="text-sm font-medium text-yellow-900">Slow Improvement</h3>
            </div>
            <p className="text-sm font-medium text-yellow-700">{data.slowImprovement.length} topics</p>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <div className="mb-4">
          <label htmlFor="topic-select" className="block text-sm font-medium text-gray-700 mb-2">
            Select Topic
          </label>
          <select
            id="topic-select"
            value={selectedTopic || ''}
            onChange={(e) => setSelectedTopic(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            {data.topicProgress.map((topic) => (
              <option key={topic.topic} value={topic.topic}>
                {topic.topic}
              </option>
            ))}
          </select>
        </div>

        {selectedTopicData && selectedTopicData.monthlyData.length > 0 && (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={selectedTopicData.monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="score" stroke="#4F46E5" strokeWidth={2} name="Skill Score" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">All Topics Progress</h3>
        </div>
        <ul className="divide-y divide-gray-200">
          {data.topicProgress.map((progress) => (
            <li
              key={progress.topic}
              className="px-6 py-4 hover:bg-gray-50 cursor-pointer"
              onClick={() => setSelectedTopic(progress.topic)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-sm font-medium text-gray-900">{progress.topic}</h4>
                    {getTrendBadge(progress.trend)}
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div>
                      <span className="text-gray-600">Current:</span>
                      <span className="ml-2 font-medium text-indigo-600">{progress.currentScore}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Previous:</span>
                      <span className="ml-2 font-medium">{progress.previousScore}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Change:</span>
                      <span className={`ml-2 font-medium ${
                        progress.change > 0 ? 'text-green-600' :
                        progress.change < 0 ? 'text-red-600' :
                        'text-gray-600'
                      }`}>
                        {progress.change > 0 ? '+' : ''}{progress.change} ({progress.changePercent > 0 ? '+' : ''}{progress.changePercent.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <ExplainPanel
        endpoint="/explain/progress"
        label="Progress"
        queryKey={['explain', 'progress']}
      />
    </div>
  );
}
