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
    return <div className="flex items-center justify-center h-screen text-gray-500">No ideas to display.</div>;
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