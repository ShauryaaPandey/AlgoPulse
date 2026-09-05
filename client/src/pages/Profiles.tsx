import { useState } from 'react';
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

export function Profiles() {
  const { connectedProfiles, refetch } = useAuth();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<AddProfileForm>({
    resolver: zodResolver(addProfileSchema)
  });

  const onSubmit = async (data: AddProfileForm) => {
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post<{ message: string }>('/profiles', { url: data.url });
      setSuccess(response.data.message);
      reset();
      await refetch();
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
      await refetch();
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

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label htmlFor="url" className="block text-sm font-medium text-gray-700">
                    Profile URL
                  </label>
                  <input
                    {...register('url')}
                    type="text"
                    placeholder="https://codeforces.com/profile/tourist"
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
                  {connectedProfiles.map((profile) => (
                    <div
                      key={profile.id}
                      className="border border-gray-200 rounded-lg p-4 flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-base font-medium text-gray-900 capitalize">
                            {profile.platform}
                          </h3>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Verified
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {profile.username}
                        </p>
                        {profile.profile_url && (
                          <a
                            href={profile.profile_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-indigo-600 hover:text-indigo-500 mt-1 inline-block"
                          >
                            View profile →
                          </a>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemove(profile.platform)}
                        disabled={removingId === profile.platform}
                        className="ml-4 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                      >
                        {removingId === profile.platform ? 'Removing...' : 'Remove'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
