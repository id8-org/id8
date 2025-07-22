import { useState, useCallback } from 'react';
import * as suggestedApi from '@/lib/api/suggestedApi';
import { Suggested, SuggestedCreate } from '@/types/suggested';

export function useSuggested(ideaId?: string) {
  const [suggested, setSuggested] = useState<Suggested | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggested = useCallback(async () => {
    if (!ideaId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await suggestedApi.getSuggestedByIdeaId(ideaId);
      setSuggested(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch suggested');
    } finally {
      setLoading(false);
    }
  }, [ideaId]);

  const createSuggested = useCallback(async (data: SuggestedCreate) => {
    setLoading(true);
    setError(null);
    try {
      const response = await suggestedApi.createSuggested(data);
      setSuggested(response.data);
      return response.data;
    } catch (err: any) {
      setError(err.message || 'Failed to create suggested');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSuggested = useCallback(async (id: string, data: SuggestedCreate) => {
    setLoading(true);
    setError(null);
    try {
      const response = await suggestedApi.updateSuggested(id, data);
      setSuggested(response.data);
      return response.data;
    } catch (err: any) {
      setError(err.message || 'Failed to update suggested');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteSuggested = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await suggestedApi.deleteSuggested(id);
      setSuggested(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete suggested');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    suggested,
    loading,
    error,
    fetchSuggested,
    createSuggested,
    updateSuggested,
    deleteSuggested,
  };
} 