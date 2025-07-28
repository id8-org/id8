import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from './components/ui/toaster';
import { LoginForm } from './components/auth/LoginForm';
import { RegisterForm } from './components/auth/RegisterForm';
import { OnboardingWizard } from './components/onboarding/OnboardingWizard';
import { getAllIdeas, generateIdea } from './lib/api';
import './App.css';
import { useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import Kanban from './pages/Kanban';
import { Sparkles } from 'lucide-react';
import AskAIWindow from './components/ui/AskAIWindow';
import { AddIdeaModal } from './components/AddIdeaModal';
import { ErrorFallback } from './components/ui/error-fallback';
import { useIdeas } from './hooks/useIdeas';
import Layout from './components/Layout';
import { refreshApiAuthHeader } from './lib/api';

// Global error boundary
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error('Global error boundary caught:', error, errorInfo);
  }
  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };
  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error || { message: 'An unexpected error occurred.' }} resetErrorBoundary={this.handleReset} />;
    }
    return this.props.children;
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && user && user.onboarding_required) {
      navigate('/onboarding');
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (user.onboarding_required) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

// Auth Route Component
const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && user) {
      if (user.onboarding_required) {
        navigate('/onboarding');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (user) {
    return null; // Will redirect via useEffect
  }

  return <>{children}</>;
};

// Onboarding Route Component
const OnboardingRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
    } else if (!isLoading && user && !user.onboarding_required) {
      navigate('/dashboard');
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!user.onboarding_required) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

function AuthPage() {
  const [isLoginMode, setIsLoginMode] = useState(true);
  
  return (
    <div className="flex items-center justify-center h-screen bg-slate-50">
      {isLoginMode ? (
        <LoginForm onSwitchToRegister={() => setIsLoginMode(false)} />
      ) : (
        <RegisterForm onSwitchToLogin={() => setIsLoginMode(true)} />
      )}
    </div>
  );
}

function DashboardPage() {
  const [addIdeaModalOpen, setAddIdeaModalOpen] = useState(false);
  const navigate = useNavigate();

  const handleOnboardingComplete = () => {
    navigate('/dashboard');
  };

  return (
    <>
      <Layout title="Idea Kanban" onAddIdea={() => setAddIdeaModalOpen(true)}>
        <Kanban />
      </Layout>
      <AddIdeaModal isOpen={addIdeaModalOpen} onClose={() => setAddIdeaModalOpen(false)} onIdeaCreated={() => setAddIdeaModalOpen(false)} />
    </>
  );
}

function OnboardingPage() {
  const navigate = useNavigate();

  const handleOnboardingComplete = () => {
    navigate('/dashboard');
  };

  return <OnboardingWizard onComplete={handleOnboardingComplete} />;
}

function AppContent() {
  return (
    <Routes>
      <Route path="/auth" element={
        <AuthRoute>
          <AuthPage />
        </AuthRoute>
      } />
      <Route path="/onboarding" element={
        <OnboardingRoute>
          <OnboardingPage />
        </OnboardingRoute>
      } />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      } />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppContent />
          <Toaster />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
