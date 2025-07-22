import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from './components/ui/toaster';
import { LoginForm } from './components/auth/LoginForm';
import { OnboardingWizard } from './components/onboarding/OnboardingWizard';
import { getAllIdeas, generateIdea } from './lib/api';
import './App.css';
import { useNavigate } from 'react-router-dom';
import Kanban from './pages/Kanban';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useState } from 'react';
import AskAIWindow from './components/ui/AskAIWindow';
import { AddIdeaModal } from './components/AddIdeaModal';
import { ErrorFallback } from './components/ui/error-fallback';
// TEMP: Import Start page for temporary routing
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

function AppContent() {
  const { user, isLoading } = useAuth();
  const [addIdeaModalOpen, setAddIdeaModalOpen] = useState(false);
  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }
  if (!user) {
    return <div className="flex items-center justify-center h-screen bg-slate-50"><LoginForm onSwitchToRegister={() => {}} /></div>;
  }
  // Render Kanban board inside Layout with sidebar and header
  return (
    <>
      <Layout title="Idea Kanban" onAddIdea={() => setAddIdeaModalOpen(true)}>
        <Kanban />
      </Layout>
      <AddIdeaModal isOpen={addIdeaModalOpen} onClose={() => setAddIdeaModalOpen(false)} onIdeaCreated={() => setAddIdeaModalOpen(false)} />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
