// IMPORTANT: This component must only be rendered as a child of the main app layout, which provides the sidebar.
// Never render KanbanBoard directly in isolation.

import React, { useState, useCallback } from 'react';
import { useIdeas } from '@/hooks/useIdeas';
import { IdeaWorkspace } from './IdeaWorkspace';
import type { Idea, Repo, IdeaStatus } from '@/lib/api';
import { z } from 'zod';
import { ideaSchema } from '@/types/schemas';

interface KanbanBoardProps {
  openAskAI: (context: { type: 'profile' } | { type: 'idea', idea: Idea } | { type: 'version', idea: Idea, version: number }) => void;
}

// Defensive: always use safeArray() for any .length or .map on possibly undefined fields
function safeArray<T>(val: T[] | undefined | null): T[] {
  return Array.isArray(val) ? val : [];
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
  // Fetch ideas for each stage
  const suggested = useIdeas('suggested');
  const deepDive = useIdeas('deep_dive');
  const iterating = useIdeas('iterating');
  const considering = useIdeas('considering');
  const closed = useIdeas('closed');

  // Debug: Log the ideas fetched for each stage
  console.log('[KANBAN DEBUG] suggested:', suggested.ideas);
  console.log('[KANBAN DEBUG] deep_dive:', deepDive.ideas);
  console.log('[KANBAN DEBUG] iterating:', iterating.ideas);
  console.log('[KANBAN DEBUG] considering:', considering.ideas);
  console.log('[KANBAN DEBUG] closed:', closed.ideas);

  // Combine all ideas for validation and modal logic
  const allIdeas = [
    ...(suggested.ideas || []),
    ...(deepDive.ideas || []),
    ...(iterating.ideas || []),
    ...(considering.ideas || []),
    ...(closed.ideas || [])
  ];

  // Debug: Log the final ideasByStage prop
  const ideasByStage = {
    suggested: safeArray(suggested.ideas),
    deep_dive: safeArray(deepDive.ideas),
    iterating: safeArray(iterating.ideas),
    considering: safeArray(considering.ideas),
    closed: safeArray(closed.ideas)
  };
  console.log('[KANBAN DEBUG] ideasByStage:', ideasByStage);

  // Add missing state for loading and error handling
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  // Placeholder for repos if needed; can be extended to fetch real repos
  const [repos] = useState<Repo[]>([]);
  const [modalIdea, setModalIdea] = useState<Idea | null>(null);

  // Defensive: Validate all ideas with Zod, fallback to [] if invalid
  const validatedIdeas: Idea[] = [];
  let validationError: any = null;
  if (Array.isArray(allIdeas)) {
    for (const idea of allIdeas) {
      const result = ideaSchema.safeParse(idea);
      if (result.success) {
        validatedIdeas.push(result.data as unknown as Idea);
      } else {
        validationError = result.error;
        // Optionally, log or collect errors for reporting
      }
    }
  }

  // Mock functions for missing properties
  const createIdea = {
    mutateAsync: async (data: any) => {
      // TODO: Implement actual create logic
      console.log('Create idea:', data);
      await suggested.refreshIdeas(); // Refresh the stage where the idea was created
      return data;
    }
  };

  const deleteIdea = {
    mutateAsync: async (ideaId: string) => {
      // TODO: Implement actual delete logic
      console.log('Delete idea:', ideaId);
      await suggested.refreshIdeas(); // Refresh the stage where the idea was deleted
      return { id: ideaId };
    }
  };

  // Defensive handlers
  const handleIdeaDeleted = useCallback(async (ideaId: string) => {
    try {
      await deleteIdea.mutateAsync(ideaId);
    } catch (e) {
      // Optionally show toast
    }
  }, [deleteIdea]);

  const handleIdeaUpdated = useCallback(async (idea: Idea) => {
    try {
      // This update logic needs to be more sophisticated to handle stage changes
      // For now, we'll just refresh the stage the idea belongs to
      const stage = idea.status;
      if (stage === 'suggested') await suggested.refreshIdeas();
      if (stage === 'deep_dive') await deepDive.refreshIdeas();
      if (stage === 'iterating') await iterating.refreshIdeas();
      if (stage === 'considering') await considering.refreshIdeas();
      if (stage === 'closed') await closed.refreshIdeas();
    } catch (e) {
      // Optionally show toast
    }
  }, [suggested, deepDive, iterating, considering, closed]);

  const handleStatusChange = useCallback(async (ideaId: string, status: IdeaStatus) => {
    try {
      // This update logic needs to be more sophisticated to handle stage changes
      // For now, we'll just refresh the stage the idea belongs to
      const stage = status;
      if (stage === 'suggested') await suggested.refreshIdeas();
      if (stage === 'deep_dive') await deepDive.refreshIdeas();
      if (stage === 'iterating') await iterating.refreshIdeas();
      if (stage === 'considering') await considering.refreshIdeas();
      if (stage === 'closed') await closed.refreshIdeas();
    } catch (e) {
      // Optionally show toast
    }
  }, [suggested, deepDive, iterating, considering, closed]);

  const handleDeepDive = useCallback(async (ideaId: string) => {
    try {
      // This deep dive logic needs to be more sophisticated to handle stage changes
      // For now, we'll just refresh the stage the idea belongs to
      const stage = 'deep_dive'; // Assuming deep dive moves to deep_dive stage
      await deepDive.refreshIdeas();
    } catch (e) {
      // Optionally show toast
    }
  }, [deepDive]);

  const refreshIdeas = useCallback(() => {
    // This refresh logic is now handled by individual stage refreshes
  }, []);

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }
  if (error) {
    return <ErrorFallback error={error} />;
  }
  if (validationError) {
    return <ErrorFallback error={validationError} rawData={allIdeas} />;
  }
  if (!Array.isArray(validatedIdeas) || validatedIdeas.length === 0) {
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

  let safeModalIdea = null;
  if (modalIdea) {
    const result = ideaSchema.safeParse(modalIdea);
    if (result.success) {
      safeModalIdea = result.data as unknown as Idea;
    }
  }

  try {
    return (
      <IdeaWorkspace
        ideasByStage={ideasByStage}
        refreshStage={stage => {
          if (stage === 'suggested') suggested.refreshIdeas();
          if (stage === 'deep_dive') deepDive.refreshIdeas();
          if (stage === 'iterating') iterating.refreshIdeas();
          if (stage === 'considering') considering.refreshIdeas();
          if (stage === 'closed') closed.refreshIdeas();
        }}
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
  } catch (e: any) {
    return <ErrorFallback error={e} rawData={validatedIdeas} />;
  }
} 