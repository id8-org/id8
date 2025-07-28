// Central type definitions for the id8 application
// This file consolidates all types to prevent duplication

// Re-export all types from individual modules
export * from './idea';
export * from './user';
export * from './repo';
export * from './api';

// Core enums and constants
export type Stage = 'suggested' | 'deep_dive' | 'iterating' | 'considering' | 'closed';
export type SourceType = 'byoi' | 'system' | 'madlib' | 'user' | 'seed';
export type IdeaType = 'side_hustle' | 'full_scale';

// Common utility types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// Common form validation types
export interface ValidationError {
  field: string;
  message: string;
}

export interface FormErrors {
  [key: string]: string;
}