import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { isAxiosError } from 'axios';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const location = useLocation();
  const interceptorSet = useRef(false);

  useEffect(() => {
    if (interceptorSet.current) return;
    interceptorSet.current = true;

    const id = api.interceptors.response.use(
      res => res,
      async err => {
        if (isAxiosError(err) && err.response?.status === 401) {
          await logout();
          window.location.href = '/login?reason=expired';
        }
        return Promise.reject(err);
      }
    );

    return () => {
      api.interceptors.response.eject(id);
      interceptorSet.current = false;
    };
  }, [logout]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const reason = new URLSearchParams(location.search).get('reason');
    const msg = reason === 'expired' ? 'expired' : 'required';
    return <Navigate to={`/login?reason=${msg}`} replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
