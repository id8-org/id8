/**
 * Consolidated hook for managing Kanban board ideas across all stages
 * Reduces code duplication and improves performance by centralizing stage management
 */

import { useState, useCallback, useEffect } from 'react';
import { useIdeas } from './useIdeas';
import type { Stage } from '@/types/idea';
import type { Idea } from '@/lib/api';

interface KanbanIdeasState {
  suggested: Idea[];
  deep_dive: Idea[];
  iterating: Idea[];
  considering: Idea[];
  closed: Idea[];
}

interface KanbanIdeasHook {
  ideasByStage: KanbanIdeasState;
  isLoading: boolean;
  error: Error | null;
  refreshStage: (stage: Stage) => Promise<void>;
  refreshAllStages: () => Promise<void>;
  allIdeas: Idea[];
}

/**
 * Custom hook for managing Kanban board state across all idea lifecycle stages
 */
export function useKanbanIdeas(): KanbanIdeasHook {
  // Individual stage hooks
  const suggested = useIdeas('suggested');
  const deepDive = useIdeas('deep_dive');
  const iterating = useIdeas('iterating');
  const considering = useIdeas('considering');
  const closed = useIdeas('closed');

  // Consolidated state
  const [error, setError] = useState<Error | null>(null);

  // Memoized ideas by stage
  const ideasByStage: KanbanIdeasState = {
    suggested: suggested.ideas || [],
    deep_dive: deepDive.ideas || [],
    iterating: iterating.ideas || [],
    considering: considering.ideas || [],
    closed: closed.ideas || [],
  };

  // Combined loading state
  const isLoading = [suggested, deepDive, iterating, considering, closed]
    .some(hook => hook.isLoading);

  // All ideas combined for validation and search
  const allIdeas = Object.values(ideasByStage).flat();

  // Consolidated refresh function for individual stages
  const refreshStage = useCallback(async (stage: Stage) => {
    try {
      setError(null);
      switch (stage) {
        case 'suggested':
          await suggested.refreshIdeas();
          break;
        case 'deep_dive':
          await deepDive.refreshIdeas();
          break;
        case 'iterating':
          await iterating.refreshIdeas();
          break;
        case 'considering':
          await considering.refreshIdeas();
          break;
        case 'closed':
          await closed.refreshIdeas();
          break;
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to refresh stage'));
    }
  }, [suggested, deepDive, iterating, considering, closed]);

  // Refresh all stages
  const refreshAllStages = useCallback(async () => {
    try {
      setError(null);
      await Promise.all([
        suggested.refreshIdeas(),
        deepDive.refreshIdeas(),
        iterating.refreshIdeas(),
        considering.refreshIdeas(),
        closed.refreshIdeas(),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to refresh ideas'));
    }
  }, [suggested, deepDive, iterating, considering, closed]);

  // Handle errors from individual hooks
  useEffect(() => {
    const hookErrors = [suggested, deepDive, iterating, considering, closed]
      .map(hook => hook.error)
      .filter(Boolean);
    
    if (hookErrors.length > 0) {
      setError(hookErrors[0] as Error);
    }
  }, [suggested.error, deepDive.error, iterating.error, considering.error, closed.error]);

  return {
    ideasByStage,
    isLoading,
    error,
    refreshStage,
    refreshAllStages,
    allIdeas,
  };
}