import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { api, getErrorMessage } from '../lib/api';

interface SyncResult {
  platform: string;
  newSubmissions: number;
  newProblems: number;
  newContests: number;
  syncedAt: string;
}

export function Dashboard() {
  const { user, connectedProfiles, refetch } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState<SyncResult[]>([]);
  const [syncError, setSyncError] = useState('');

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncError('');
    setSyncResults([]);

    try {
      const response = await api.post<{ results: SyncResult[] }>('/sync');
      setSyncResults(response.data.results);
      await refetch();
    } catch (error) {
      setSyncError(getErrorMessage(error));
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Welcome, {user?.name}!
              </h1>
              <p className="text-gray-600 mb-6">{user?.email}</p>

              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-medium text-gray-900">
                    Connected Profiles
                  </h2>
                  {connectedProfiles.length > 0 && (
                    <button
                      onClick={handleSync}
                      disabled={isSyncing}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                      {isSyncing ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Syncing...
                        </>
                      ) : (
                        'Sync Now'
                      )}
                    </button>
                  )}
                </div>

                {syncError && (
                  <div className="rounded-md bg-red-50 p-4 mb-4">
                    <p className="text-sm text-red-800">{syncError}</p>
                  </div>
                )}

                {syncResults.length > 0 && (
                  <div className="rounded-md bg-green-50 p-4 mb-4">
                    <h3 className="text-sm font-medium text-green-800 mb-2">Sync Complete!</h3>
                    {syncResults.map((result) => (
                      <div key={result.platform} className="text-sm text-green-700 capitalize">
                        <strong>{result.platform}:</strong> {result.newSubmissions} new submissions, {result.newProblems} new problems, {result.newContests} new contests
                      </div>
                    ))}
                  </div>
                )}

                {connectedProfiles.length === 0 ? (
                  <div className="text-center py-12">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No profiles connected</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Get started by connecting your competitive programming profile.
                    </p>
                    <div className="mt-6">
                      <a
                        href="/profiles"
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        Connect Profile
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {connectedProfiles.map((profile) => (
                      <div
                        key={profile.id}
                        className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 capitalize">
                              {profile.platform}
                            </p>
                            <p className="text-sm text-gray-500 truncate">
                              {profile.username}
                            </p>
                          </div>
                          <div className="ml-4 flex-shrink-0">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Connected
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
