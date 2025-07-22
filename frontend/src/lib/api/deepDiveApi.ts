import api from './api';
import { DeepDive, DeepDiveCreate } from '@/types/deepDive';

export const createDeepDive = (data: DeepDiveCreate) =>
  api.post<DeepDive>('/deep-dive/', data);

export const getDeepDiveById = (id: string) =>
  api.get<DeepDive>(`/deep-dive/${id}`);

export const getDeepDiveByIdeaId = (ideaId: string) =>
  api.get<DeepDive>(`/deep-dive/idea/${ideaId}`);

export const updateDeepDive = (id: string, data: DeepDiveCreate) =>
  api.put<DeepDive>(`/deep-dive/${id}`, data);

export const deleteDeepDive = (id: string) =>
  api.delete(`/deep-dive/${id}`); 