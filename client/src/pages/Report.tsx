import { useState } from 'react';
import { Navbar } from '../components/Navbar';
import { api, getErrorMessage } from '../lib/api';
import { useToast } from '../components/Toast';

export function Report() {
  const { toastSuccess, toastError } = useToast();
  const [loading, setLoading] = useState<'json' | 'markdown' | null>(null);

  const download = async (format: 'json' | 'markdown') => {
    setLoading(format);
    try {
      const res = await api.get(`/report?format=${format}`, { responseType: 'blob' });
      const ext = format === 'json' ? 'json' : 'md';
      const blob = new Blob([res.data], { type: format === 'json' ? 'application/json' : 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `algopulse-report-${new Date().toISOString().slice(0, 10)}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      toastSuccess(`${format === 'json' ? 'JSON' : 'Markdown'} report downloaded`);
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="text-center mb-8">
            <div className="text-4xl mb-3">📊</div>
            <h1 className="text-2xl font-bold text-gray-900">Download Report</h1>
            <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">
              Export your complete AlgoPulse analytics — skills, weaknesses, failures, progress,
              contests, and open recommendations.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => download('json')}
              disabled={loading !== null}
              className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-gray-200 hover:border-indigo-400 hover:bg-indigo-50/40 disabled:opacity-50 transition-all"
            >
              <span className="text-3xl">{ loading === 'json' ? '⏳' : '{}' }</span>
              <div>
                <p className="font-semibold text-gray-900">JSON Report</p>
                <p className="text-xs text-gray-500 mt-0.5">Structured data, great for analysis</p>
              </div>
              <span className="text-xs px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full font-medium">
                {loading === 'json' ? 'Downloading…' : 'Download .json'}
              </span>
            </button>

            <button
              onClick={() => download('markdown')}
              disabled={loading !== null}
              className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-gray-200 hover:border-green-400 hover:bg-green-50/40 disabled:opacity-50 transition-all"
            >
              <span className="text-3xl">{ loading === 'markdown' ? '⏳' : '#' }</span>
              <div>
                <p className="font-semibold text-gray-900">Markdown Report</p>
                <p className="text-xs text-gray-500 mt-0.5">Readable, great for sharing</p>
              </div>
              <span className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                {loading === 'markdown' ? 'Downloading…' : 'Download .md'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
