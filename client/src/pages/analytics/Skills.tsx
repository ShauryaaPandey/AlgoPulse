import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { api, getErrorMessage } from '../../lib/api';

interface Skill {
  topic: string;
  score: number;
  confidence: number;
  maxRating: number;
  maxDifficulty: string;
  consistentRating: number;
  recentTrend: 'improving' | 'stable' | 'declining';
}

export function Skills() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chartType, setChartType] = useState<'bar' | 'radar'>('bar');
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);

  useEffect(() => {
    fetchSkills();
  }, []);

  const fetchSkills = async () => {
    try {
      setLoading(true);
      const response = await api.get<{ skills: Skill[] }>('/analytics/skills');
      setSkills(response.data.skills.sort((a, b) => b.score - a.score));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'improving') return '📈';
    if (trend === 'declining') return '📉';
    return '➡️';
  };

  const getTrendColor = (trend: string) => {
    if (trend === 'improving') return 'text-green-600';
    if (trend === 'declining') return 'text-red-600';
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading skills data...</div>
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

  if (skills.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No skills data</h3>
        <p className="mt-1 text-sm text-gray-500">Sync your profile to see your skill analytics</p>
      </div>
    );
  }

  const barData = skills.map(skill => ({
    name: skill.topic.length > 15 ? skill.topic.substring(0, 15) + '...' : skill.topic,
    fullName: skill.topic,
    score: Math.round(skill.score),
    confidence: Math.round(skill.confidence * 100)
  }));

  const radarData = skills.slice(0, 8).map(skill => ({
    topic: skill.topic.length > 12 ? skill.topic.substring(0, 12) + '...' : skill.topic,
    score: Math.round(skill.score)
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Topic Skills</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setChartType('bar')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              chartType === 'bar'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Bar Chart
          </button>
          <button
            onClick={() => setChartType('radar')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              chartType === 'radar'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Radar Chart
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        {chartType === 'bar' ? (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis domain={[0, 100]} />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length > 0) {
                    const entry = payload[0];
                    if (!entry) return null;
                    return (
                      <div className="bg-white p-3 border border-gray-200 rounded shadow">
                        <p className="font-medium">{entry.payload.fullName}</p>
                        <p className="text-sm text-indigo-600">Score: {entry.value}</p>
                        <p className="text-sm text-gray-600">Confidence: {entry.payload.confidence}%</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Bar dataKey="score" fill="#4F46E5" name="Skill Score" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="topic" />
              <PolarRadiusAxis domain={[0, 100]} />
              <Radar name="Skill Score" dataKey="score" stroke="#4F46E5" fill="#4F46E5" fillOpacity={0.6} />
              <Tooltip />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Detailed Skills Breakdown</h3>
        </div>
        <ul className="divide-y divide-gray-200">
          {skills.map((skill) => (
            <li key={skill.topic} className="px-4 py-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-sm font-medium text-gray-900">{skill.topic}</h4>
                    <span className={`text-sm ${getTrendColor(skill.recentTrend)}`}>
                      {getTrendIcon(skill.recentTrend)} {skill.recentTrend}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-2xl font-bold text-indigo-600">{Math.round(skill.score)}</span>
                      <span className="text-sm text-gray-500 ml-1">/ 100</span>
                    </div>
                    <div className="flex-1 bg-gray-200 rounded-full h-3 max-w-xs">
                      <div
                        className="bg-indigo-600 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${skill.score}%` }}
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => setExpandedTopic(expandedTopic === skill.topic ? null : skill.topic)}
                    className="mt-2 text-xs text-indigo-600 hover:text-indigo-800"
                  >
                    {expandedTopic === skill.topic ? 'Hide details' : 'Show details'}
                  </button>
                  {expandedTopic === skill.topic && (
                    <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Max Rating:</span>
                        <span className="ml-2 font-medium">{skill.maxRating}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Max Difficulty:</span>
                        <span className="ml-2 font-medium">{skill.maxDifficulty}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Consistent Rating:</span>
                        <span className="ml-2 font-medium">{skill.consistentRating}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Confidence:</span>
                        <span className="ml-2 font-medium">{Math.round(skill.confidence * 100)}%</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
