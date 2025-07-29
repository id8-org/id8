// IMPORTANT: This component must only be rendered as a child of the main app layout, which provides the sidebar.
// Never render KanbanBoard directly in isolation.

import React, { useState, useCallback } from 'react';
import { useKanbanIdeas } from '@/hooks/useKanbanIdeas';
import { validateIdeas, validateIdea } from '@/lib/validation';
import { IdeaWorkspace } from './IdeaWorkspace';
import type { Idea, Repo, IdeaStatus } from '@/lib/api';

interface KanbanBoardProps {
  openAskAI: (context: { type: 'profile' } | { type: 'idea', idea: Idea } | { type: 'version', idea: Idea, version: number }) => void;
}

function ErrorFallback({ error, rawData }: { error: Error; rawData?: unknown }) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <div className="text-red-600 font-bold text-lg mb-2">Could not load Kanban board</div>
      <div className="text-red-500 mb-4">{error?.message || 'Invalid data received from backend.'}</div>
      {rawData && (
        <details className="w-full max-w-xl bg-gray-100 rounded p-2 text-xs">
          <summary className="cursor-pointer text-blue-700">Show Raw Data</summary>
          <pre className="overflow-x-auto whitespace-pre-wrap">{JSON.stringify(rawData, null, 2)}</pre>
        </details>
      )}
    </div>
  );
}

export default function KanbanBoard({ openAskAI }: KanbanBoardProps) {
  // Use consolidated Kanban ideas hook
  const { ideasByStage, isLoading, error, refreshStage, allIdeas } = useKanbanIdeas();
  
  // Validate all ideas
  const validation = validateIdeas(allIdeas);
  
  // Local state for modal and repos
  const [repos] = useState<Repo[]>([]);
  const [modalIdea, setModalIdea] = useState<Idea | null>(null);

  // Mock functions for missing properties - TODO: Implement proper API calls
  const createIdea = {
    mutateAsync: async (data: Idea) => {
      console.log('Create idea:', data);
      await refreshStage('suggested'); // Refresh the stage where ideas are typically created
      return data;
    }
  };

  const deleteIdea = {
    mutateAsync: async (ideaId: string) => {
      console.log('Delete idea:', ideaId);
      // TODO: Determine which stage to refresh based on the deleted idea
      await refreshStage('suggested'); 
      return { id: ideaId };
    }
  };

  // Consolidated event handlers using the centralized refresh logic
  const handleIdeaDeleted = useCallback(async (ideaId: string) => {
    try {
      await deleteIdea.mutateAsync(ideaId);
    } catch (e) {
      console.error('Failed to delete idea:', e);
    }
  }, [deleteIdea]);

  const handleIdeaUpdated = useCallback(async (idea: Idea) => {
    try {
      await refreshStage(idea.status);
    } catch (e) {
      console.error('Failed to update idea:', e);
    }
  }, [refreshStage]);

  const handleStatusChange = useCallback(async (ideaId: string, status: IdeaStatus) => {
    try {
      await refreshStage(status);
    } catch (e) {
      console.error('Failed to change status:', e);
    }
  }, [refreshStage]);

  const handleDeepDive = useCallback(async (ideaId: string) => {
    try {
      await refreshStage('deep_dive');
    } catch (e) {
      console.error('Failed to trigger deep dive:', e);
    }
  }, [refreshStage]);

  // Error handling
  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }
  
  if (error) {
    return <ErrorFallback error={error} />;
  }
  
  if (validation.hasErrors) {
    return <ErrorFallback error={validation.errors[0]} rawData={validation.invalidIdeas} />;
  }
  
  if (validation.validIdeas.length === 0) {
    // Enhanced empty state for better user experience
    return (
      <div className="flex flex-col items-center justify-center h-screen p-8 text-center">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">Ready to Generate Ideas?</h3>
          <p className="text-gray-600 mb-6 leading-relaxed">
            Your profile is complete! Now you can generate personalized startup ideas based on your skills, interests, and goals. Click the "Add Idea" button in the header to get started.
          </p>
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-center text-blue-700 text-sm">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              AI-powered ideas are tailored to your experience and preferences
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Validate modal idea if present
  const safeModalIdea = modalIdea ? validateIdea(modalIdea).idea : null;

  try {
    return (
      <IdeaWorkspace
        ideasByStage={ideasByStage}
        refreshStage={refreshStage}
        repos={repos}
        onIdeaDeleted={handleIdeaDeleted}
        onIdeaUpdated={handleIdeaUpdated}
        onStatusChange={handleStatusChange}
        onDeepDive={handleDeepDive}
        modalIdea={modalIdea}
        setModalIdea={setModalIdea}
        openAskAI={openAskAI}
      />
    );
  } catch (e) {
    return <ErrorFallback error={e instanceof Error ? e : new Error('Unknown error')} rawData={validation.validIdeas} />;
  }
} 