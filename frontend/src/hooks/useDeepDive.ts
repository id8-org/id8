import { useState, useCallback } from 'react';
import * as deepDiveApi from '@/lib/api/deepDiveApi';
import { DeepDive, DeepDiveCreate } from '@/types/deepDive';

export function useDeepDive(ideaId?: string) {
  const [deepDive, setDeepDive] = useState<DeepDive | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDeepDive = useCallback(async () => {
    if (!ideaId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await deepDiveApi.getDeepDiveByIdeaId(ideaId);
      setDeepDive(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch deep dive');
    } finally {
      setLoading(false);
    }
  }, [ideaId]);

  const createDeepDive = useCallback(async (data: DeepDiveCreate) => {
    setLoading(true);
    setError(null);
    try {
      const response = await deepDiveApi.createDeepDive(data);
      setDeepDive(response.data);
      return response.data;
    } catch (err: any) {
      setError(err.message || 'Failed to create deep dive');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateDeepDive = useCallback(async (id: string, data: DeepDiveCreate) => {
    setLoading(true);
    setError(null);
    try {
      const response = await deepDiveApi.updateDeepDive(id, data);
      setDeepDive(response.data);
      return response.data;
    } catch (err: any) {
      setError(err.message || 'Failed to update deep dive');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteDeepDive = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await deepDiveApi.deleteDeepDive(id);
      setDeepDive(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete deep dive');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    deepDive,
    loading,
    error,
    fetchDeepDive,
    createDeepDive,
    updateDeepDive,
    deleteDeepDive,
  };
} 