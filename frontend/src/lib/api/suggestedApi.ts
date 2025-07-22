import { api } from '../api';
import { Suggested, SuggestedCreate } from '@/types/suggested';

export const createSuggested = (data: SuggestedCreate) =>
  api.post<Suggested>('/advanced/suggested/', data);

export const getSuggestedById = (id: string) =>
  api.get<Suggested>(`/advanced/suggested/${id}`);

export const getSuggestedByIdeaId = (ideaId: string) =>
  api.get<Suggested>(`/advanced/suggested/idea/${ideaId}`);

export const updateSuggested = (id: string, data: SuggestedCreate) =>
  api.put<Suggested>(`/advanced/suggested/${id}`, data);

export const deleteSuggested = (id: string) =>
  api.delete(`/advanced/suggested/${id}`); 