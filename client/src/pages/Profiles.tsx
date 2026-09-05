import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { api, getErrorMessage } from '../lib/api';

const addProfileSchema = z.object({
  url: z.string().min(1, 'URL is required').url('Please enter a valid URL')
});

type AddProfileForm = z.infer<typeof addProfileSchema>;

const PLATFORM_BADGE: Record<string, { label: string; color: string; icon: string }> = {
  codeforces: { label: 'Codeforces', color: 'bg-blue-100 text-blue-800', icon: '⚡' },
  leetcode:   { label: 'LeetCode',   color: 'bg-yellow-100 text-yellow-800', icon: '🧩' },
  codechef:   { label: 'CodeChef',   color: 'bg-amber-100 text-amber-800', icon: '👨‍🍳' }
};

interface SyncStatus {
  platform: string;
  username: string;
  lastSync: string | null;
  lastSubmissionTime: string | null;
}

interface SyncResult {
  platform: string;
  newSubmissions: number;
  newProblems: number;
  newContests: number;
  syncedAt: string;
}

export function Profiles() {
  const { connectedProfiles, refetch } = useAuth();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus[]>([]);
  const [syncingPlatform, setSyncingPlatform] = useState<string | null>(null);
  const [syncResults, setSyncResults] = useState<SyncResult[]>([]);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<AddProfileForm>({
    resolver: zodResolver(addProfileSchema)
  });

  useEffect(() => {
    fetchSyncStatus();
  }, [connectedProfiles]);

  const fetchSyncStatus = async () => {
    try {
      const response = await api.get<{ status: SyncStatus[] }>('/sync/status');
      setSyncStatus(response.data.status);
    } catch (err) {
      console.error('Failed to fetch sync status:', err);
    }
  };

  const getRelativeTime = (dateString: string | null) => {
    if (!dateString) return 'Never';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  };

  const getSyncStatusForPlatform = (platform: string) => {
    return syncStatus.find(s => s.platform === platform);
  };

  const handleSyncPlatform = async (platform: string) => {
    setSyncingPlatform(platform);
    setError('');
    setSyncResults([]);

    try {
      const response = await api.post<{ results: SyncResult[] }>(`/sync?platform=${platform}`);
      setSyncResults(response.data.results);
      await Promise.all([refetch(), fetchSyncStatus()]);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSyncingPlatform(null);
    }
  };

  const onSubmit = async (data: AddProfileForm) => {
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post<{ message: string }>('/profiles', { url: data.url });
      setSuccess(response.data.message);
      reset();
      await Promise.all([refetch(), fetchSyncStatus()]);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (platform: string) => {
    setRemovingId(platform);
    setError('');
    setSuccess('');

    try {
      const response = await api.delete<{ message: string }>(`/profiles/${platform}`);
      setSuccess(response.data.message);
      await Promise.all([refetch(), fetchSyncStatus()]);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white overflow-hidden shadow rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Add Profile
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Paste your coding profile URL from Codeforces, LeetCode, or CodeChef
              </p>
              <div className="mb-4 flex flex-wrap gap-2 text-xs text-gray-500">
                <span className="px-2 py-1 bg-gray-100 rounded font-mono">codeforces.com/profile/tourist</span>
                <span className="px-2 py-1 bg-gray-100 rounded font-mono">leetcode.com/u/username/</span>
                <span className="px-2 py-1 bg-gray-100 rounded font-mono">codechef.com/users/username</span>
              </div>

              {error && (
                <div className="rounded-md bg-red-50 p-4 mb-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {success && (
                <div className="rounded-md bg-green-50 p-4 mb-4">
                  <p className="text-sm text-green-800">{success}</p>
                </div>
              )}

              {syncResults.length > 0 && (
                <div className="rounded-md bg-blue-50 p-4 mb-4">
                  <h3 className="text-sm font-medium text-blue-800 mb-2">Sync Complete!</h3>
                  {syncResults.map((result) => (
                    <div key={result.platform} className="text-sm text-blue-700 capitalize">
                      <strong>{result.platform}:</strong> {result.newSubmissions} new submissions, {result.newProblems} new problems, {result.newContests} new contests
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label htmlFor="url" className="block text-sm font-medium text-gray-700">
                    Profile URL
                  </label>
                  <input
                    {...register('url')}
                    type="text"
                    placeholder="https://codeforces.com/profile/tourist  or  https://leetcode.com/u/username/  or  https://www.codechef.com/users/username"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                  {errors.url && (
                    <p className="mt-1 text-sm text-red-600">{errors.url.message}</p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {isSubmitting ? 'Verifying...' : 'Add Profile'}
                </button>
              </form>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Connected Profiles
              </h2>

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
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No profiles yet</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Add your first profile using the form above
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {connectedProfiles.map((profile) => {
                    const status = getSyncStatusForPlatform(profile.platform);
                    const isSyncing = syncingPlatform === profile.platform;
                    const badge = PLATFORM_BADGE[profile.platform] ?? { label: profile.platform, color: 'bg-gray-100 text-gray-700', icon: '💻' };

                    return (
                      <div
                        key={profile.id}
                        className="border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${badge.color}`}>
                                <span>{badge.icon}</span>
                                {badge.label}
                              </span>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Verified
                              </span>
                            </div>
                            <p className="text-sm font-medium text-gray-900 mb-1">
                              {profile.username}
                            </p>
                            {profile.profile_url && (
                              <a
                                href={profile.profile_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-indigo-600 hover:text-indigo-500 inline-block mb-2"
                              >
                                View profile →
                              </a>
                            )}
                            {status && (
                              <p className="text-xs text-gray-500">
                                Last synced: {getRelativeTime(status.lastSync)}
                              </p>
                            )}
                          </div>
                          <div className="ml-4 flex gap-2">
                            <button
                              onClick={() => handleSyncPlatform(profile.platform)}
                              disabled={isSyncing}
                              className="px-3 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 rounded-md hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                            >
                              {isSyncing ? 'Syncing...' : 'Sync'}
                            </button>
                            <button
                              onClick={() => handleRemove(profile.platform)}
                              disabled={removingId === profile.platform}
                              className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                            >
                              {removingId === profile.platform ? 'Removing...' : 'Remove'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
