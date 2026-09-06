import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Dashboard } from './pages/Dashboard';
import { Profiles } from './pages/Profiles';
import { NotFound } from './pages/NotFound';
import { SkeletonChart } from './components/Skeleton';

const Analytics = lazy(() => import('./pages/Analytics').then(m => ({ default: m.Analytics })));
const Recommendations = lazy(() => import('./pages/Recommendations').then(m => ({ default: m.Recommendations })));
const Search = lazy(() => import('./pages/Search').then(m => ({ default: m.Search })));
const InterviewPrep = lazy(() => import('./pages/InterviewPrep').then(m => ({ default: m.InterviewPrep })));
const Report = lazy(() => import('./pages/Report').then(m => ({ default: m.Report })));

function PageFallback() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="h-14 bg-white border-b border-gray-200" />
      <div className="max-w-5xl mx-auto py-8 px-4 space-y-4">
        <SkeletonChart />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SkeletonChart />
          <SkeletonChart />
        </div>
      </div>
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: unknown) => {
        if (error && typeof error === 'object' && 'response' in error) {
          const status = (error as { response?: { status?: number } }).response?.status;
          if (status === 401 || status === 403 || status === 404) return false;
        }
        return failureCount < 2;
      }
    }
  }
});

function LazyRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <Suspense fallback={<PageFallback />}>
        {children}
      </Suspense>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ToastProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/profiles" element={<ProtectedRoute><Profiles /></ProtectedRoute>} />
                <Route path="/analytics" element={<LazyRoute><Analytics /></LazyRoute>} />
                <Route path="/recommendations" element={<LazyRoute><Recommendations /></LazyRoute>} />
                <Route path="/search" element={<LazyRoute><Search /></LazyRoute>} />
                <Route path="/interview" element={<LazyRoute><InterviewPrep /></LazyRoute>} />
                <Route path="/report" element={<LazyRoute><Report /></LazyRoute>} />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
