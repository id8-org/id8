import api from './api';
import { Iterating, IteratingCreate } from '@/types/iterating';

export const createIterating = (data: IteratingCreate) =>
  api.post<Iterating>('/advanced/iterating/', data);

export const getIteratingById = (id: string) =>
  api.get<Iterating>(`/advanced/iterating/${id}`);

export const getIteratingByIdeaId = (ideaId: string) =>
  api.get<Iterating>(`/advanced/iterating/idea/${ideaId}`);

export const updateIterating = (id: string, data: IteratingCreate) =>
  api.put<Iterating>(`/advanced/iterating/${id}`, data);

export const deleteIterating = (id: string) =>
  api.delete(`/advanced/iterating/${id}`); 