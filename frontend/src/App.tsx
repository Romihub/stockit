import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import { ThemeProvider, createTheme } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ErrorBoundary from './components/shared/ErrorBoundary';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Create MUI theme that complements our Tailwind config
const theme = createTheme({
  palette: {
    primary: {
      light: '#4B83DB',
      main: '#1A56DB',
      dark: '#1E429F',
    },
    secondary: {
      light: '#9CA3AF',
      main: '#6B7280',
      dark: '#4B5563',
    },
  },
  typography: {
    fontFamily: [
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
  },
});

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
  </div>
);

// Lazy load pages for better performance
const HomePage = React.lazy(() => import('./pages/Home'));
const MarketsPage = React.lazy(() => import('./pages/Markets'));
const SearchPage = React.lazy(() => import('./pages/Search'));
const WatchlistPage = React.lazy(() => import('./pages/Watchlist'));
const ProfilePage = React.lazy(() => import('./pages/Profile'));
const LoginPage = React.lazy(() => import('./pages/auth/Login'));
const SignupPage = React.lazy(() => import('./pages/auth/Signup'));

const App = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ToastProvider>
          <AuthProvider>
            <Router>
              <Routes>
                {/* Auth routes */}
                <Route path="/login" element={
                  <React.Suspense fallback={<LoadingFallback />}>
                    <LoginPage />
                  </React.Suspense>
                } />
                <Route path="/signup" element={
                  <React.Suspense fallback={<LoadingFallback />}>
                    <SignupPage />
                  </React.Suspense>
                } />

                {/* Protected routes */}
                <Route path="/" element={
                  <ProtectedRoute>
                    <Layout>
                      <React.Suspense fallback={<LoadingFallback />}>
                        <HomePage />
                      </React.Suspense>
                    </Layout>
                  </ProtectedRoute>
                } />
                <Route path="/markets" element={
                  <ProtectedRoute>
                    <Layout>
                      <React.Suspense fallback={<LoadingFallback />}>
                        <MarketsPage />
                      </React.Suspense>
                    </Layout>
                  </ProtectedRoute>
                } />
                <Route path="/search" element={
                  <ProtectedRoute>
                    <Layout>
                      <React.Suspense fallback={<LoadingFallback />}>
                        <SearchPage />
                      </React.Suspense>
                    </Layout>
                  </ProtectedRoute>
                } />
                <Route path="/watchlist" element={
                  <ProtectedRoute>
                    <Layout>
                      <React.Suspense fallback={<LoadingFallback />}>
                        <WatchlistPage />
                      </React.Suspense>
                    </Layout>
                  </ProtectedRoute>
                } />
                <Route path="/profile" element={
                  <ProtectedRoute>
                    <Layout>
                      <React.Suspense fallback={<LoadingFallback />}>
                        <ProfilePage />
                      </React.Suspense>
                    </Layout>
                  </ProtectedRoute>
                } />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Router>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
