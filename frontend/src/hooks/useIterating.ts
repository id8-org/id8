import { useState, useCallback } from 'react';
import { 
  getIteratingById, 
  getIteratingByIdeaId, 
  createIterating, 
  updateIterating, 
  deleteIterating 
} from '@/lib/api';
import { Iterating, IteratingCreate } from '@/types/iterating';

export function useIterating(ideaId?: string) {
  const [iterating, setIterating] = useState<Iterating | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchIterating = useCallback(async () => {
    if (!ideaId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await getIteratingByIdeaId(ideaId);
      setIterating(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch iterating');
    } finally {
      setLoading(false);
    }
  }, [ideaId]);

  const createIterating = useCallback(async (data: IteratingCreate) => {
    setLoading(true);
    setError(null);
    try {
      const response = await createIterating(data);
      setIterating(response.data);
      return response.data;
    } catch (err: any) {
      setError(err.message || 'Failed to create iterating');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateIterating = useCallback(async (id: string, data: IteratingCreate) => {
    setLoading(true);
    setError(null);
    try {
      const response = await updateIterating(id, data);
      setIterating(response.data);
      return response.data;
    } catch (err: any) {
      setError(err.message || 'Failed to update iterating');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteIterating = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await deleteIterating(id);
      setIterating(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete iterating');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    iterating,
    loading,
    error,
    fetchIterating,
    createIterating,
    updateIterating,
    deleteIterating,
  };
} 