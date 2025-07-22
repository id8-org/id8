import { useEffect, useRef, useState } from 'react';
import { updateIdea, triggerDeepDive, api, getAllIdeas } from '@/lib/api';

export function useIdeas(stage: string = 'suggested') {
  const [ideas, setIdeas] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Poll for updates every 30 seconds
  useEffect(() => {
    let isMounted = true;
    const fetchIdeas = async () => {
      try {
        // Use new getAllIdeas which always returns an array
        const ideasArr = await getAllIdeas();
        if (isMounted) {
          setIdeas(ideasArr);
          setLastUpdated(Date.now());
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    };
    fetchIdeas(); // Initial fetch
    pollingRef.current = setInterval(fetchIdeas, 30000); // 30s
    return () => {
      isMounted = false;
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [stage]);

  // Manual refresh for instant update after mutation
  const refreshIdeas = async () => {
    try {
      const ideasArr = await getAllIdeas();
      setIdeas(ideasArr);
      setLastUpdated(Date.now());
    } catch (error) {
      console.error('Refresh error:', error);
    }
  };

  // Real implementation for updating an idea
  const updateIdeaWrapper = {
    mutateAsync: async ({ id, data }: { id: string; data: any }) => {
      try {
        const updated = await updateIdea(id, data);
        await refreshIdeas();
        return updated;
      } catch (error) {
        console.error('Update idea error:', error);
        throw error;
      }
    }
  };

  // Real implementation for triggering deep dive
  const requestDeepDive = {
    mutateAsync: async (id: string) => {
      try {
        const result = await triggerDeepDive(id);
        await refreshIdeas();
        return result;
      } catch (error) {
        console.error('Deep dive error:', error);
        throw error;
      }
    }
  };

  const refetchIdeas = refreshIdeas;

  return { ideas, refreshIdeas, updateIdea: updateIdeaWrapper, requestDeepDive, refetchIdeas };
} 